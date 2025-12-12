using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Security;

namespace WebApplicationFlytwo.Data;

public static class IdentitySeeder
{
    public static async Task SeedAsync(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration,
        ILogger logger)
    {
        var adminEmail = configuration["SeedAdmin:Email"];
        var adminPassword = configuration["SeedAdmin:Password"];
        var adminCompanyName = configuration["SeedAdmin:CompanyName"] ?? "FlyTwo";
        var defaultRoles = FlytwoRoles.All;

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            logger.LogWarning("SeedAdmin credentials not configured - skipping admin user seeding");
            return;
        }

        // Ensure roles exist
        foreach (var roleName in defaultRoles)
        {
            if (await roleManager.RoleExistsAsync(roleName))
                continue;

            var roleResult = await roleManager.CreateAsync(new IdentityRole(roleName));
            if (!roleResult.Succeeded)
            {
                logger.LogWarning("Failed to create default role {Role}: {Errors}", roleName,
                    string.Join(", ", roleResult.Errors.Select(e => e.Description)));
            }
        }

        // Ensure default company exists
        var company = await context.Empresas
            .OrderBy(e => e.CreatedAt)
            .FirstOrDefaultAsync(e => e.Name.ToLower() == adminCompanyName.ToLower());

        if (company is null)
        {
            company = new Empresa
            {
                Id = Guid.NewGuid(),
                Name = adminCompanyName,
                CreatedAt = DateTime.UtcNow
            };
            context.Empresas.Add(company);
            await context.SaveChangesAsync();
        }

        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                FullName = "FlyTwo Admin",
                EmpresaId = company.Id
            };

            var createResult = await userManager.CreateAsync(adminUser, adminPassword);
            if (!createResult.Succeeded)
            {
                logger.LogWarning("Failed to create default admin user: {Errors}",
                    string.Join(", ", createResult.Errors.Select(e => e.Description)));
                return;
            }
        }
        else if (adminUser.EmpresaId is null)
        {
            adminUser.EmpresaId = company.Id;
            var updateResult = await userManager.UpdateAsync(adminUser);
            if (!updateResult.Succeeded)
            {
                logger.LogWarning("Failed to set EmpresaId for default admin user: {Errors}",
                    string.Join(", ", updateResult.Errors.Select(e => e.Description)));
            }
        }

        if (!await userManager.IsInRoleAsync(adminUser, FlytwoRoles.Admin))
        {
            var addRoleResult = await userManager.AddToRoleAsync(adminUser, FlytwoRoles.Admin);
            if (!addRoleResult.Succeeded)
            {
                logger.LogWarning("Failed to add admin user to role {Role}: {Errors}", FlytwoRoles.Admin,
                    string.Join(", ", addRoleResult.Errors.Select(e => e.Description)));
            }
        }
    }
}
