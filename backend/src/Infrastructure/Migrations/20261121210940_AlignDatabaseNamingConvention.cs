using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AlignDatabaseNamingConvention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_installation_proofs_installations_installation_id",
                table: "installation_proofs");

            migrationBuilder.DropForeignKey(
                name: "FK_installation_proofs_users_technician_id",
                table: "installation_proofs");

            migrationBuilder.DropPrimaryKey(
                name: "PK_installation_proofs",
                table: "installation_proofs");

            migrationBuilder.RenameIndex(
                name: "IX_service_tickets_replacement_packing_order_id",
                table: "service_tickets",
                newName: "ix_service_tickets_replacement_packing_order_id");

            migrationBuilder.RenameIndex(
                name: "IX_service_tickets_assigned_technician_id",
                table: "service_tickets",
                newName: "ix_service_tickets_assigned_technician_id");

            migrationBuilder.RenameIndex(
                name: "IX_installation_proofs_technician_id",
                table: "installation_proofs",
                newName: "ix_installation_proofs_technician_id");

            migrationBuilder.AddPrimaryKey(
                name: "pk_installation_proofs",
                table: "installation_proofs",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "fk_installation_proofs_installations_installation_id",
                table: "installation_proofs",
                column: "installation_id",
                principalTable: "installations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "fk_installation_proofs_users_technician_id",
                table: "installation_proofs",
                column: "technician_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_installation_proofs_installations_installation_id",
                table: "installation_proofs");

            migrationBuilder.DropForeignKey(
                name: "fk_installation_proofs_users_technician_id",
                table: "installation_proofs");

            migrationBuilder.DropPrimaryKey(
                name: "pk_installation_proofs",
                table: "installation_proofs");

            migrationBuilder.RenameIndex(
                name: "ix_service_tickets_replacement_packing_order_id",
                table: "service_tickets",
                newName: "IX_service_tickets_replacement_packing_order_id");

            migrationBuilder.RenameIndex(
                name: "ix_service_tickets_assigned_technician_id",
                table: "service_tickets",
                newName: "IX_service_tickets_assigned_technician_id");

            migrationBuilder.RenameIndex(
                name: "ix_installation_proofs_technician_id",
                table: "installation_proofs",
                newName: "IX_installation_proofs_technician_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_installation_proofs",
                table: "installation_proofs",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_installation_proofs_installations_installation_id",
                table: "installation_proofs",
                column: "installation_id",
                principalTable: "installations",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_installation_proofs_users_technician_id",
                table: "installation_proofs",
                column: "technician_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
