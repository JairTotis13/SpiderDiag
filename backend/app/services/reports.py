import io
import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.diagnostic import (
    DiagnosticRepository,
    ReportRepository,
    DTCRepository,
    LiveDataRepository,
)
from app.repositories.user import UserRepository
from app.repositories.client_vehicle import ClientRepository, VehicleRepository

logger = logging.getLogger(__name__)


class ReportService:
    def __init__(self, db: AsyncSession):
        self.diag_repo = DiagnosticRepository(db)
        self.report_repo = ReportRepository(db)
        self.dtc_repo = DTCRepository(db)
        self.live_repo = LiveDataRepository(db)
        self.user_repo = UserRepository(db)
        self.client_repo = ClientRepository(db)
        self.vehicle_repo = VehicleRepository(db)

    async def generate_report(
        self,
        diagnostic_id: int,
        technician_id: int,
        shop_name: str = "SpiderDiag Taller",
        shop_address: str = "",
        shop_phone: str = "",
        recommendations: str = "",
    ) -> Optional[bytes]:
        diagnostic = await self.diag_repo.get_with_relations(diagnostic_id)
        if not diagnostic:
            return None

        vehicle = await self.vehicle_repo.get_by_id(diagnostic.vehicle_id)
        client = await self.client_repo.get_by_id(diagnostic.client_id)
        technician = await self.user_repo.get_by_id(technician_id)
        dtc_codes = await self.dtc_repo.get_by_diagnostic(diagnostic_id)
        live_readings = await self.live_repo.get_by_diagnostic(diagnostic_id)

        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.colors import HexColor
            from reportlab.lib.units import mm
            from reportlab.platypus import (
                SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
            )
            from reportlab.lib import colors
        except ImportError:
            logger.error("reportlab not installed")
            return None

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20 * mm,
            leftMargin=20 * mm,
            topMargin=20 * mm,
            bottomMargin=20 * mm,
        )
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["h1"],
            fontSize=22,
            textColor=HexColor("#1a1a2e"),
            spaceAfter=6,
        )
        elements.append(Paragraph(f"<b>{shop_name}</b>", title_style))
        elements.append(Paragraph(
            f"Reporte de Diagnóstico Automotriz | {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}",
            styles["Normal"],
        ))
        elements.append(Spacer(1, 12))

        # Divider line
        elements.append(Paragraph("<hr width='100%' color='#e94560'/>", styles["Normal"]))
        elements.append(Spacer(1, 12))

        # Shop info
        elements.append(Paragraph(f"<b>Taller:</b> {shop_name}", styles["Normal"]))
        if shop_address:
            elements.append(Paragraph(f"<b>Dirección:</b> {shop_address}", styles["Normal"]))
        if shop_phone:
            elements.append(Paragraph(f"<b>Teléfono:</b> {shop_phone}", styles["Normal"]))
        elements.append(Spacer(1, 12))

        # Client info
        elements.append(Paragraph("<b>── Datos del Cliente ──</b>", styles["Heading2"]))
        if client:
            elements.append(Paragraph(f"<b>Nombre:</b> {client.full_name}", styles["Normal"]))
            if client.phone:
                elements.append(Paragraph(f"<b>Teléfono:</b> {client.phone}", styles["Normal"]))
            if client.email:
                elements.append(Paragraph(f"<b>Correo:</b> {client.email}", styles["Normal"]))
        elements.append(Spacer(1, 12))

        # Vehicle info
        elements.append(Paragraph("<b>── Datos del Vehículo ──</b>", styles["Heading2"]))
        if vehicle:
            elements.append(Paragraph(
                f"<b>Vehículo:</b> {vehicle.brand} {vehicle.model} ({vehicle.year})",
                styles["Normal"],
            ))
            if vehicle.vin:
                elements.append(Paragraph(f"<b>VIN:</b> {vehicle.vin}", styles["Normal"]))
            if vehicle.license_plate:
                elements.append(Paragraph(f"<b>Placas:</b> {vehicle.license_plate}", styles["Normal"]))
            if vehicle.mileage:
                elements.append(Paragraph(f"<b>Kilometraje:</b> {vehicle.mileage:,.0f} km", styles["Normal"]))
            if vehicle.fuel_type:
                elements.append(Paragraph(f"<b>Combustible:</b> {vehicle.fuel_type}", styles["Normal"]))
        elements.append(Spacer(1, 12))

        # Technician info
        if technician:
            elements.append(Paragraph(
                f"<b>Técnico responsable:</b> {technician.full_name}",
                styles["Normal"],
            ))
        elements.append(Spacer(1, 12))

        # DTC Codes
        elements.append(Paragraph("<b>── Códigos DTC Encontrados ──</b>", styles["Heading2"]))
        if dtc_codes:
            dtc_data = [["Código", "Descripción", "Estado", "Severidad"]]
            for dtc in dtc_codes:
                dtc_data.append([
                    dtc.code,
                    dtc.description or "—",
                    "Activo" if not dtc.is_cleared else "Borrado",
                    dtc.severity or "—",
                ])
            dtc_table = Table(dtc_data, colWidths=[60, 250, 60, 60])
            dtc_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HexColor("#f0f0f5")]),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            elements.append(dtc_table)
        else:
            elements.append(Paragraph(
                "<i>No se encontraron códigos DTC en este diagnóstico.</i>",
                styles["Normal"],
            ))
        elements.append(Spacer(1, 12))

        # Live Data Summary
        elements.append(Paragraph("<b>── Resumen de Lecturas en Vivo ──</b>", styles["Heading2"]))
        if live_readings:
            latest = live_readings[0]
            live_data = [
                ["Parámetro", "Valor"],
                ["RPM", f"{latest.rpm:.0f}" if latest.rpm else "—"],
                ["Velocidad", f"{latest.speed:.0f} km/h" if latest.speed else "—"],
                ["Temp. Motor", f"{latest.engine_temp:.1f}°C" if latest.engine_temp else "—"],
                ["Voltaje", f"{latest.voltage:.1f}V" if latest.voltage else "—"],
                ["Carga Motor", f"{latest.engine_load:.1f}%" if latest.engine_load else "—"],
                ["Presión MAP", f"{latest.map_pressure:.1f} kPa" if latest.map_pressure else "—"],
                ["TPS", f"{latest.tps_position:.1f}%" if latest.tps_position else "—"],
            ]
            live_table = Table(live_data, colWidths=[140, 140])
            live_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), HexColor("#1a1a2e")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HexColor("#f0f0f5")]),
            ]))
            elements.append(live_table)
        else:
            elements.append(Paragraph("<i>No hay lecturas en vivo registradas.</i>", styles["Normal"]))
        elements.append(Spacer(1, 12))

        # Recommendations
        if recommendations:
            elements.append(Paragraph("<b>── Recomendaciones ──</b>", styles["Heading2"]))
            elements.append(Paragraph(recommendations, styles["Normal"]))
            elements.append(Spacer(1, 6))
        elif dtc_codes:
            auto_recs = self._generate_recommendations(dtc_codes)
            if auto_recs:
                elements.append(Paragraph("<b>── Recomendaciones ──</b>", styles["Heading2"]))
                for rec in auto_recs:
                    elements.append(Paragraph(f"• {rec}", styles["Normal"]))

        # Footer
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("<hr width='100%' color='#e94560'/>", styles["Normal"]))
        elements.append(Paragraph(
            f"<i>Generado por SpiderDiag — {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M:%S')}</i>",
            styles["Normal"],
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def _generate_recommendations(self, dtc_codes) -> list:
        recs = []
        for dtc in dtc_codes:
            code = dtc.code.upper()
            if code.startswith("P01"):
                recs.append(f"[{dtc.code}] Verificar sistema de combustible: bomba, inyectores y filtro.")
            elif code.startswith("P02"):
                recs.append(f"[{dtc.code}] Revisar sensores de oxígeno (O2) y mezcla aire/combustible.")
            elif code.startswith("P03"):
                recs.append(f"[{dtc.code}] Inspeccionar sistema de encendido: bujías, bobinas y cables.")
            elif code.startswith("P04"):
                recs.append(f"[{dtc.code}] Verificar sistema de emisiones evaporativas (EVAP).")
            elif code.startswith("P05"):
                recs.append(f"[{dtc.code}] Revisar sistema de control de ralentí y actuador IAC.")
            elif code.startswith("P06"):
                recs.append(f"[{dtc.code}] Verificar módulo de control del motor (ECM/PCM) y cableado.")
            elif code.startswith("P07"):
                recs.append(f"[{dtc.code}] Inspeccionar transmisión y sensores de velocidad.")
        return list(set(recs))[:5]  # max 5 unique recommendations
