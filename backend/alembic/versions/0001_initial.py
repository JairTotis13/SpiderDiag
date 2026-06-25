"""initial migration

Revision ID: 0001_initial
Create Date: 2024-06-24 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Roles
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(50), nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_roles_name", "roles", ["name"])

    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("role_id", sa.Integer(), sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    # Clients
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clients_full_name", "clients", ["full_name"])

    # Vehicles
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("brand", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("vin", sa.String(17), nullable=True),
        sa.Column("license_plate", sa.String(20), nullable=True),
        sa.Column("mileage", sa.Float(), nullable=True),
        sa.Column("fuel_type", sa.String(30), nullable=True),
        sa.Column("observations", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("vin"),
    )
    op.create_index("ix_vehicles_brand", "vehicles", ["brand"])
    op.create_index("ix_vehicles_client_id", "vehicles", ["client_id"])
    op.create_index("ix_vehicles_license_plate", "vehicles", ["license_plate"])
    op.create_index("ix_vehicles_vin", "vehicles", ["vin"])

    # Diagnostics
    op.create_table(
        "diagnostics",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("technician_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("start_time", sa.DateTime(), nullable=True),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("readings_snapshot", postgresql.JSON(), nullable=True),
        sa.Column("codes_found", postgresql.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="in_progress"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_diagnostics_vehicle_id", "diagnostics", ["vehicle_id"])
    op.create_index("ix_diagnostics_technician_id", "diagnostics", ["technician_id"])
    op.create_index("ix_diagnostics_client_id", "diagnostics", ["client_id"])

    # DTC Codes
    op.create_table(
        "dtc_codes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("diagnostic_id", sa.Integer(), sa.ForeignKey("diagnostics.id"), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="active"),
        sa.Column("severity", sa.String(20), nullable=True),
        sa.Column("is_cleared", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("cleared_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_dtc_codes_code", "dtc_codes", ["code"])
    op.create_index("ix_dtc_codes_diagnostic_id", "dtc_codes", ["diagnostic_id"])
    op.create_index("ix_dtc_codes_vehicle_id", "dtc_codes", ["vehicle_id"])

    # Live Data
    op.create_table(
        "live_data",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("diagnostic_id", sa.Integer(), sa.ForeignKey("diagnostics.id"), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("rpm", sa.Float(), nullable=True),
        sa.Column("speed", sa.Float(), nullable=True),
        sa.Column("engine_temp", sa.Float(), nullable=True),
        sa.Column("voltage", sa.Float(), nullable=True),
        sa.Column("fuel_consumption", sa.Float(), nullable=True),
        sa.Column("engine_load", sa.Float(), nullable=True),
        sa.Column("map_pressure", sa.Float(), nullable=True),
        sa.Column("tps_position", sa.Float(), nullable=True),
        sa.Column("timestamp", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_live_data_diagnostic_id", "live_data", ["diagnostic_id"])
    op.create_index("ix_live_data_vehicle_id", "live_data", ["vehicle_id"])

    # Alerts
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("diagnostic_id", sa.Integer(), sa.ForeignKey("diagnostics.id"), nullable=True),
        sa.Column("alert_type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), nullable=False, server_default="warning"),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("current_value", sa.Float(), nullable=True),
        sa.Column("threshold_min", sa.Float(), nullable=True),
        sa.Column("threshold_max", sa.Float(), nullable=True),
        sa.Column("is_read", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_vehicle_id", "alerts", ["vehicle_id"])
    op.create_index("ix_alerts_alert_type", "alerts", ["alert_type"])

    # Reports
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("diagnostic_id", sa.Integer(), sa.ForeignKey("diagnostics.id"), nullable=False),
        sa.Column("technician_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("report_type", sa.String(50), nullable=False, server_default="full"),
        sa.Column("pdf_path", sa.String(500), nullable=True),
        sa.Column("shop_name", sa.String(200), nullable=True),
        sa.Column("shop_address", sa.String(300), nullable=True),
        sa.Column("shop_phone", sa.String(30), nullable=True),
        sa.Column("recommendations", sa.Text(), nullable=True),
        sa.Column("generated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reports_diagnostic_id", "reports", ["diagnostic_id"])

    # Audit Logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("details", sa.String(1000), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])

    # Seed default roles
    op.execute("INSERT INTO roles (name, description, created_at, updated_at) VALUES "
               "('Administrador', 'Full system access', NOW(), NOW()),"
               "('Técnico', 'Diagnostic and technical operations', NOW(), NOW()),"
               "('Supervisor', 'Read-only with report access', NOW(), NOW())")

    # Seed default admin user (password: Admin123!)
    op.execute(
        "INSERT INTO users (full_name, email, hashed_password, phone, is_active, role_id, created_at, updated_at) "
        "VALUES ('Admin SpiderDiag', 'admin@spiderdiag.com', "
        "'$2b$12$LJ3m4ys3GZfnYMz8kVsH7eF6BtSNEpuGtWVNQ5YVlqCpXK9fWyO1G', "
        "'+525551234567', true, 1, NOW(), NOW())"
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("reports")
    op.drop_table("alerts")
    op.drop_table("live_data")
    op.drop_table("dtc_codes")
    op.drop_table("diagnostics")
    op.drop_table("vehicles")
    op.drop_table("clients")
    op.drop_table("users")
    op.drop_table("roles")
