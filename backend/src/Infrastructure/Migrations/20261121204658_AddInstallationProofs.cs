using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInstallationProofs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "installation_proofs",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    installation_id = table.Column<int>(type: "integer", nullable: false),
                    technician_id = table.Column<int>(type: "integer", nullable: false),
                    work_started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    work_completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    system_capacity_kw = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    tested_generation_kw = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    grid_connected = table.Column<bool>(type: "boolean", nullable: false),
                    panel_array_photo_url = table.Column<string>(type: "text", nullable: false),
                    inverter_photo_url = table.Column<string>(type: "text", nullable: false),
                    meter_photo_url = table.Column<string>(type: "text", nullable: false),
                    customer_signature_data = table.Column<string>(type: "text", nullable: false),
                    signed_by_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    signed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_installation_proofs", x => x.id);
                    table.ForeignKey(
                        name: "FK_installation_proofs_installations_installation_id",
                        column: x => x.installation_id,
                        principalTable: "installations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_installation_proofs_users_technician_id",
                        column: x => x.technician_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_installation_proofs_installation_id",
                table: "installation_proofs",
                column: "installation_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_installation_proofs_technician_id",
                table: "installation_proofs",
                column: "technician_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "installation_proofs");
        }
    }
}
