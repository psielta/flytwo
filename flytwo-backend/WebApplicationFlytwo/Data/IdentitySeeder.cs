using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Data;

public static class IdentitySeeder
{
    public static async Task SeedAsync(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration,
        ILogger logger)
    {
        var adminEmail = configuration["SeedAdmin:Email"];
        var adminPassword = configuration["SeedAdmin:Password"];
        const string adminRole = "Admin";

        if (string.IsNullOrWhiteSpace(adminEmail) || string.IsNullOrWhiteSpace(adminPassword))
        {
            logger.LogWarning("SeedAdmin credentials not configured - skipping admin user seeding");
            return;
        }

        // Ensure role exists
        if (!await roleManager.RoleExistsAsync(adminRole))
        {
            var roleResult = await roleManager.CreateAsync(new IdentityRole(adminRole));
            if (!roleResult.Succeeded)
            {
                logger.LogWarning("Failed to create default role {Role}: {Errors}", adminRole,
                    string.Join(", ", roleResult.Errors.Select(e => e.Description)));
            }
        }

        var adminUser = await userManager.FindByEmailAsync(adminEmail);
        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                FullName = "FlyTwo Admin"
            };

            var createResult = await userManager.CreateAsync(adminUser, adminPassword);
            if (!createResult.Succeeded)
            {
                logger.LogWarning("Failed to create default admin user: {Errors}",
                    string.Join(", ", createResult.Errors.Select(e => e.Description)));
                return;
            }
        }

        if (!await userManager.IsInRoleAsync(adminUser, adminRole))
        {
            var addRoleResult = await userManager.AddToRoleAsync(adminUser, adminRole);
            if (!addRoleResult.Succeeded)
            {
                logger.LogWarning("Failed to add admin user to role {Role}: {Errors}", adminRole,
                    string.Join(", ", addRoleResult.Errors.Select(e => e.Description)));
            }
        }
    }
}
