using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApplicationFlytwo.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantToProductsAndTodos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_Category",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_Sku",
                table: "Products");

            migrationBuilder.AddColumn<Guid>(
                name: "EmpresaId",
                table: "Todos",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EmpresaId",
                table: "Products",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Todos_EmpresaId",
                table: "Todos",
                column: "EmpresaId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_EmpresaId",
                table: "Products",
                column: "EmpresaId");

            migrationBuilder.CreateIndex(
                name: "IX_Products_EmpresaId_Category",
                table: "Products",
                columns: new[] { "EmpresaId", "Category" });

            migrationBuilder.CreateIndex(
                name: "IX_Products_EmpresaId_Sku",
                table: "Products",
                columns: new[] { "EmpresaId", "Sku" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Empresas_EmpresaId",
                table: "Products",
                column: "EmpresaId",
                principalTable: "Empresas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Todos_Empresas_EmpresaId",
                table: "Todos",
                column: "EmpresaId",
                principalTable: "Empresas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_Empresas_EmpresaId",
                table: "Products");

            migrationBuilder.DropForeignKey(
                name: "FK_Todos_Empresas_EmpresaId",
                table: "Todos");

            migrationBuilder.DropIndex(
                name: "IX_Todos_EmpresaId",
                table: "Todos");

            migrationBuilder.DropIndex(
                name: "IX_Products_EmpresaId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_EmpresaId_Category",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_EmpresaId_Sku",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "EmpresaId",
                table: "Todos");

            migrationBuilder.DropColumn(
                name: "EmpresaId",
                table: "Products");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Category",
                table: "Products",
                column: "Category");

            migrationBuilder.CreateIndex(
                name: "IX_Products_Sku",
                table: "Products",
                column: "Sku",
                unique: true);
        }
    }
}
