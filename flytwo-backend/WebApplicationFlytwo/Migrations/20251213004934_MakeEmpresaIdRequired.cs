using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WebApplicationFlytwo.Migrations
{
    /// <inheritdoc />
    public partial class MakeEmpresaIdRequired : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DO $$
                DECLARE company_id uuid;
                BEGIN
                    SELECT "Id" INTO company_id
                    FROM "Empresas"
                    ORDER BY "CreatedAt"
                    LIMIT 1;

                    IF company_id IS NULL THEN
                        company_id := '11111111-1111-1111-1111-111111111111';
                        INSERT INTO "Empresas" ("Id", "Name", "CreatedAt")
                        VALUES (company_id, 'FlyTwo', CURRENT_TIMESTAMP);
                    END IF;

                    UPDATE "AspNetUsers"
                    SET "EmpresaId" = company_id
                    WHERE "EmpresaId" IS NULL OR "EmpresaId" = '00000000-0000-0000-0000-000000000000';

                    UPDATE "Products"
                    SET "EmpresaId" = company_id
                    WHERE "EmpresaId" IS NULL OR "EmpresaId" = '00000000-0000-0000-0000-000000000000';

                    UPDATE "Todos"
                    SET "EmpresaId" = company_id
                    WHERE "EmpresaId" IS NULL OR "EmpresaId" = '00000000-0000-0000-0000-000000000000';
                END $$;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "EmpresaId",
                table: "Todos",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "EmpresaId",
                table: "Products",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "EmpresaId",
                table: "AspNetUsers",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.Sql("""ALTER TABLE "AspNetUsers" ALTER COLUMN "EmpresaId" DROP DEFAULT;""");
            migrationBuilder.Sql("""ALTER TABLE "Products" ALTER COLUMN "EmpresaId" DROP DEFAULT;""");
            migrationBuilder.Sql("""ALTER TABLE "Todos" ALTER COLUMN "EmpresaId" DROP DEFAULT;""");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "EmpresaId",
                table: "Todos",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "EmpresaId",
                table: "Products",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<Guid>(
                name: "EmpresaId",
                table: "AspNetUsers",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");
        }
    }
}
