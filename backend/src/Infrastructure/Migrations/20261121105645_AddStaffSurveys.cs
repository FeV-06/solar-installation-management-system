using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffSurveys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "surveys",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    installation_id = table.Column<int>(type: "integer", nullable: false),
                    technician_id = table.Column<int>(type: "integer", nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_by_id = table.Column<int>(type: "integer", nullable: false),
                    shadow_free_roof_area_square_metres = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    monthly_bill_rupees = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    grid_suitable = table.Column<bool>(type: "boolean", nullable: true),
                    roof_direction_degrees = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    roof_tilt_degrees = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    cable_distance_metres = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    submitted_by_id = table.Column<int>(type: "integer", nullable: true),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reviewed_by_id = table.Column<int>(type: "integer", nullable: true),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    review_notes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    version = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_surveys", x => x.id);
                    table.ForeignKey(
                        name: "fk_surveys_installations_installation_id",
                        column: x => x.installation_id,
                        principalTable: "installations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_surveys_users_created_by_id",
                        column: x => x.created_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_surveys_users_reviewed_by_id",
                        column: x => x.reviewed_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_surveys_users_submitted_by_id",
                        column: x => x.submitted_by_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_surveys_users_technician_id",
                        column: x => x.technician_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_surveys_created_by_id",
                table: "surveys",
                column: "created_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_surveys_reviewed_by_id",
                table: "surveys",
                column: "reviewed_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_surveys_submitted_by_id",
                table: "surveys",
                column: "submitted_by_id");

            migrationBuilder.CreateIndex(
                name: "ix_surveys_technician_status_scheduled_at",
                table: "surveys",
                columns: new[] { "technician_id", "status", "scheduled_at" });

            migrationBuilder.CreateIndex(
                name: "ux_surveys_installation_open_or_approved",
                table: "surveys",
                column: "installation_id",
                unique: true,
                filter: "status IN ('Scheduled', 'Submitted', 'Approved')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "surveys");
        }
    }
}
