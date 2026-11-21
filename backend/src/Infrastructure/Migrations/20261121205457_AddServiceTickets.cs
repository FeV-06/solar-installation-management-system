using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceTickets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "service_tickets",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    installation_id = table.Column<int>(type: "integer", nullable: false),
                    customer_id = table.Column<int>(type: "integer", nullable: false),
                    assigned_technician_id = table.Column<int>(type: "integer", nullable: true),
                    serial_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    hardware_item = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    category = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    fault_code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    description = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    photo_url = table.Column<string>(type: "text", nullable: true),
                    damage_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    is_warranty_covered = table.Column<bool>(type: "boolean", nullable: false),
                    parts_cost_rupees = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    labor_cost_rupees = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    total_billed_rupees = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    admin_notes = table.Column<string>(type: "text", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    customer_approved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    replacement_packing_order_id = table.Column<int>(type: "integer", nullable: true),
                    replacement_serial_number = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    technician_resolution_notes = table.Column<string>(type: "text", nullable: true),
                    resolved_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    customer_signature_data = table.Column<string>(type: "text", nullable: true),
                    technician_signed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    customer_confirmed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_service_tickets", x => x.id);
                    table.ForeignKey(
                        name: "fk_service_tickets_customers_customer_id",
                        column: x => x.customer_id,
                        principalTable: "customers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_service_tickets_installations_installation_id",
                        column: x => x.installation_id,
                        principalTable: "installations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_service_tickets_packing_orders_replacement_packing_order_id",
                        column: x => x.replacement_packing_order_id,
                        principalTable: "packing_orders",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_service_tickets_users_assigned_technician_id",
                        column: x => x.assigned_technician_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_service_tickets_assigned_technician_id",
                table: "service_tickets",
                column: "assigned_technician_id");

            migrationBuilder.CreateIndex(
                name: "ix_service_tickets_customer_id",
                table: "service_tickets",
                column: "customer_id");

            migrationBuilder.CreateIndex(
                name: "ix_service_tickets_installation_id",
                table: "service_tickets",
                column: "installation_id");

            migrationBuilder.CreateIndex(
                name: "IX_service_tickets_replacement_packing_order_id",
                table: "service_tickets",
                column: "replacement_packing_order_id");

            migrationBuilder.CreateIndex(
                name: "ix_service_tickets_serial_number",
                table: "service_tickets",
                column: "serial_number");

            migrationBuilder.CreateIndex(
                name: "ix_service_tickets_status",
                table: "service_tickets",
                column: "status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "service_tickets");
        }
    }
}
