using AutoMapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using WebApplicationFlytwo.Controllers;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using WebApplicationFlytwo.Tests.Fixtures;
using ZiggyCreatures.Caching.Fusion;

namespace WebApplicationFlytwo.Tests.Controllers;

public class ProductControllerTests : IClassFixture<TestFixture>
{
    private readonly TestFixture _fixture;

    public ProductControllerTests(TestFixture fixture)
    {
        _fixture = fixture;
    }

    private ProductController CreateController(
        Data.AppDbContext context,
        IMapper? mapper = null,
        IFusionCache? cache = null,
        Mock<ILogger<ProductController>>? logger = null)
    {
        var controller = new ProductController(
            context,
            mapper ?? _fixture.CreateMapper(),
            cache ?? _fixture.CreateCache(),
            (logger ?? _fixture.CreateLogger<ProductController>()).Object
        );

        _fixture.SetAuthenticatedUser(controller);
        return controller;
    }

    #region GetAll Tests

    [Fact]
    public async Task GetAll_ReturnsOkWithProducts_WhenProductsExist()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(5);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetAll();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject;
        returnedProducts.Should().HaveCount(5);
    }

    [Fact]
    public async Task GetAll_ReturnsEmptyList_WhenNoProductsExist()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var controller = CreateController(context);

        // Act
        var result = await controller.GetAll();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject;
        returnedProducts.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAll_ReturnsProductsOrderedByCreatedAtDescending()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(3);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetAll();

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject.ToList();

        // Products are created with CreatedAt = baseDate.AddMinutes(-i), so earlier products have later timestamps
        returnedProducts[0].CreatedAt.Should().BeOnOrAfter(returnedProducts[1].CreatedAt);
        returnedProducts[1].CreatedAt.Should().BeOnOrAfter(returnedProducts[2].CreatedAt);
    }

    #endregion

    #region GetById Tests

    [Fact]
    public async Task GetById_ReturnsOkWithProduct_WhenProductExists()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var product = TestFixture.CreateProduct(1, "Test Product");
        await context.Products.AddAsync(product);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetById(1);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProduct = okResult.Value.Should().BeOfType<ProductDto>().Subject;
        returnedProduct.Id.Should().Be(1);
        returnedProduct.Name.Should().Be("Test Product");
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenProductDoesNotExist()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var controller = CreateController(context);

        // Act
        var result = await controller.GetById(999);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task GetById_ReturnsCorrectProduct_WhenMultipleProductsExist()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(5);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetById(3);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProduct = okResult.Value.Should().BeOfType<ProductDto>().Subject;
        returnedProduct.Id.Should().Be(3);
        returnedProduct.Name.Should().Be("Product 3");
    }

    #endregion

    #region GetByCategory Tests

    [Fact]
    public async Task GetByCategory_ReturnsProductsInCategory()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = new List<Product>
        {
            TestFixture.CreateProduct(1, "Product 1", "Electronics"),
            TestFixture.CreateProduct(2, "Product 2", "Electronics"),
            TestFixture.CreateProduct(3, "Product 3", "Clothing")
        };
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategory("Electronics");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject;
        returnedProducts.Should().HaveCount(2);
        returnedProducts.Should().AllSatisfy(p => p.Category.Should().Be("Electronics"));
    }

    [Fact]
    public async Task GetByCategory_IsCaseInsensitive()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = new List<Product>
        {
            TestFixture.CreateProduct(1, "Product 1", "Electronics"),
            TestFixture.CreateProduct(2, "Product 2", "ELECTRONICS")
        };
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategory("electronics");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject;
        returnedProducts.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetByCategory_ReturnsOnlyActiveProducts()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var activeProduct = TestFixture.CreateProduct(1, "Active Product", "Electronics");
        var inactiveProduct = TestFixture.CreateProduct(2, "Inactive Product", "Electronics");
        inactiveProduct.IsActive = false;

        await context.Products.AddRangeAsync(new[] { activeProduct, inactiveProduct });
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategory("Electronics");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject;
        returnedProducts.Should().HaveCount(1);
        returnedProducts.First().Name.Should().Be("Active Product");
    }

    [Fact]
    public async Task GetByCategory_ReturnsEmptyList_WhenCategoryNotFound()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var product = TestFixture.CreateProduct(1, "Product 1", "Electronics");
        await context.Products.AddAsync(product);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategory("NonExistentCategory");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject;
        returnedProducts.Should().BeEmpty();
    }

    [Fact]
    public async Task GetByCategory_ReturnsProductsOrderedByName()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = new List<Product>
        {
            TestFixture.CreateProduct(1, "Zebra Product", "Electronics"),
            TestFixture.CreateProduct(2, "Alpha Product", "Electronics"),
            TestFixture.CreateProduct(3, "Middle Product", "Electronics")
        };
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategory("Electronics");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject.ToList();
        returnedProducts[0].Name.Should().Be("Alpha Product");
        returnedProducts[1].Name.Should().Be("Middle Product");
        returnedProducts[2].Name.Should().Be("Zebra Product");
    }

    #endregion

    #region Create Tests

    [Fact]
    public async Task Create_ReturnsCreatedAtAction_WhenProductIsValid()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var controller = CreateController(context);

        var request = new CreateProductRequest
        {
            Name = "New Product",
            Description = "Description",
            Category = "Electronics",
            Price = 99.99m,
            StockQuantity = 10,
            Sku = "SKU-NEW-001"
        };

        // Act
        var result = await controller.Create(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        createdResult.ActionName.Should().Be(nameof(ProductController.GetById));

        var returnedProduct = createdResult.Value.Should().BeOfType<ProductDto>().Subject;
        returnedProduct.Name.Should().Be("New Product");
        returnedProduct.Sku.Should().Be("SKU-NEW-001");
    }

    [Fact]
    public async Task Create_SetsCreatedAtToUtcNow()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var controller = CreateController(context);
        var beforeCreate = DateTime.UtcNow;

        var request = new CreateProductRequest
        {
            Name = "New Product",
            Description = "Description",
            Category = "Electronics",
            Price = 99.99m,
            StockQuantity = 10,
            Sku = "SKU-NEW-001"
        };

        // Act
        var result = await controller.Create(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var returnedProduct = createdResult.Value.Should().BeOfType<ProductDto>().Subject;
        returnedProduct.CreatedAt.Should().BeOnOrAfter(beforeCreate);
        returnedProduct.CreatedAt.Should().BeOnOrBefore(DateTime.UtcNow);
    }

    [Fact]
    public async Task Create_SetsIsActiveToTrue()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var controller = CreateController(context);

        var request = new CreateProductRequest
        {
            Name = "New Product",
            Description = "Description",
            Category = "Electronics",
            Price = 99.99m,
            StockQuantity = 10,
            Sku = "SKU-NEW-001"
        };

        // Act
        var result = await controller.Create(request);

        // Assert
        var createdResult = result.Result.Should().BeOfType<CreatedAtActionResult>().Subject;
        var returnedProduct = createdResult.Value.Should().BeOfType<ProductDto>().Subject;
        returnedProduct.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenSkuAlreadyExists()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var existingProduct = TestFixture.CreateProduct(1, "Existing Product");
        existingProduct.Sku = "SKU-DUPLICATE";
        await context.Products.AddAsync(existingProduct);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var request = new CreateProductRequest
        {
            Name = "New Product",
            Description = "Description",
            Category = "Electronics",
            Price = 99.99m,
            StockQuantity = 10,
            Sku = "SKU-DUPLICATE"
        };

        // Act
        var result = await controller.Create(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task Create_PersistsProductToDatabase()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var controller = CreateController(context);

        var request = new CreateProductRequest
        {
            Name = "Persisted Product",
            Description = "Description",
            Category = "Electronics",
            Price = 149.99m,
            StockQuantity = 25,
            Sku = "SKU-PERSIST"
        };

        // Act
        await controller.Create(request);

        // Assert
        var savedProduct = await context.Products.FirstOrDefaultAsync(p => p.Sku == "SKU-PERSIST");
        savedProduct.Should().NotBeNull();
        savedProduct!.Name.Should().Be("Persisted Product");
        savedProduct.Price.Should().Be(149.99m);
    }

    #endregion

    #region Update Tests

    [Fact]
    public async Task Update_ReturnsOkWithUpdatedProduct_WhenProductExists()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var product = TestFixture.CreateProduct(1, "Original Name");
        await context.Products.AddAsync(product);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var request = new UpdateProductRequest
        {
            Name = "Updated Name",
            Description = "Updated Description",
            Category = "Electronics",
            Price = 199.99m,
            StockQuantity = 50,
            IsActive = true
        };

        // Act
        var result = await controller.Update(1, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProduct = okResult.Value.Should().BeOfType<ProductDto>().Subject;
        returnedProduct.Name.Should().Be("Updated Name");
        returnedProduct.Price.Should().Be(199.99m);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_WhenProductDoesNotExist()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var controller = CreateController(context);

        var request = new UpdateProductRequest
        {
            Name = "Updated Name",
            Description = "Description",
            Category = "Electronics",
            Price = 99.99m,
            StockQuantity = 10,
            IsActive = true
        };

        // Act
        var result = await controller.Update(999, request);

        // Assert
        result.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Update_SetsUpdatedAtToUtcNow()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var product = TestFixture.CreateProduct(1, "Original Name");
        await context.Products.AddAsync(product);
        await context.SaveChangesAsync();

        var controller = CreateController(context);
        var beforeUpdate = DateTime.UtcNow;

        var request = new UpdateProductRequest
        {
            Name = "Updated Name",
            Description = "Description",
            Category = "Electronics",
            Price = 99.99m,
            StockQuantity = 10,
            IsActive = true
        };

        // Act
        var result = await controller.Update(1, request);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProduct = okResult.Value.Should().BeOfType<ProductDto>().Subject;
        returnedProduct.UpdatedAt.Should().NotBeNull();
        returnedProduct.UpdatedAt!.Value.Should().BeOnOrAfter(beforeUpdate);
    }

    [Fact]
    public async Task Update_PersistsChangesToDatabase()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var product = TestFixture.CreateProduct(1, "Original Name");
        await context.Products.AddAsync(product);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        var request = new UpdateProductRequest
        {
            Name = "Database Updated",
            Description = "New Description",
            Category = "Clothing",
            Price = 299.99m,
            StockQuantity = 75,
            IsActive = false
        };

        // Act
        await controller.Update(1, request);

        // Assert
        var updatedProduct = await context.Products.FindAsync(1);
        updatedProduct.Should().NotBeNull();
        updatedProduct!.Name.Should().Be("Database Updated");
        updatedProduct.Category.Should().Be("Clothing");
        updatedProduct.Price.Should().Be(299.99m);
        updatedProduct.IsActive.Should().BeFalse();
    }

    #endregion

    #region Delete Tests

    [Fact]
    public async Task Delete_ReturnsNoContent_WhenProductExists()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var product = TestFixture.CreateProduct(1, "Product to Delete");
        await context.Products.AddAsync(product);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.Delete(1);

        // Assert
        result.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_WhenProductDoesNotExist()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var controller = CreateController(context);

        // Act
        var result = await controller.Delete(999);

        // Assert
        result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task Delete_RemovesProductFromDatabase()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var product = TestFixture.CreateProduct(1, "Product to Delete");
        await context.Products.AddAsync(product);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        await controller.Delete(1);

        // Assert
        var deletedProduct = await context.Products.FindAsync(1);
        deletedProduct.Should().BeNull();
    }

    [Fact]
    public async Task Delete_DoesNotAffectOtherProducts()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(3);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        await controller.Delete(2);

        // Assert
        var remainingProducts = await context.Products.ToListAsync();
        remainingProducts.Should().HaveCount(2);
        remainingProducts.Should().Contain(p => p.Id == 1);
        remainingProducts.Should().Contain(p => p.Id == 3);
        remainingProducts.Should().NotContain(p => p.Id == 2);
    }

    #endregion

    #region Cache Integration Tests

    [Fact]
    public async Task GetById_UsesCacheOnSecondCall()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<Data.AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var cache = _fixture.CreateCache();
        var product = TestFixture.CreateProduct(1, "Cached Product");

        // First context - add product
        using (var context1 = new Data.AppDbContext(options))
        {
            await context1.Products.AddAsync(product);
            await context1.SaveChangesAsync();
        }

        // First call with context2 - populates cache
        using (var context2 = new Data.AppDbContext(options))
        {
            var controller1 = CreateController(context2, cache: cache);
            var result1 = await controller1.GetById(1);
            var okResult1 = result1.Result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedProduct1 = okResult1.Value.Should().BeOfType<ProductDto>().Subject;
            returnedProduct1.Name.Should().Be("Cached Product");
        }

        // Modify database directly with context3 (simulating another process)
        using (var context3 = new Data.AppDbContext(options))
        {
            var dbProduct = await context3.Products.FindAsync(1);
            dbProduct!.Name = "Modified in DB";
            await context3.SaveChangesAsync();
        }

        // Second call with context4 - should return cached value
        using (var context4 = new Data.AppDbContext(options))
        {
            var controller2 = CreateController(context4, cache: cache);
            var result2 = await controller2.GetById(1);

            // Assert
            var okResult2 = result2.Result.Should().BeOfType<OkObjectResult>().Subject;
            var returnedProduct = okResult2.Value.Should().BeOfType<ProductDto>().Subject;
            returnedProduct.Name.Should().Be("Cached Product"); // Still returns cached value
        }
    }

    [Fact]
    public async Task GetAll_UsesCacheOnSecondCall()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var cache = _fixture.CreateCache();
        var products = TestFixture.CreateProducts(3);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context, cache: cache);

        // Act - First call (populates cache)
        var result1 = await controller.GetAll();

        // Add more products directly to database
        await context.Products.AddAsync(TestFixture.CreateProduct(10, "New Product"));
        await context.SaveChangesAsync();

        // Second call should return cached value
        var result2 = await controller.GetAll();

        // Assert
        var okResult2 = result2.Result.Should().BeOfType<OkObjectResult>().Subject;
        var returnedProducts = okResult2.Value.Should().BeAssignableTo<IEnumerable<ProductDto>>().Subject;
        returnedProducts.Should().HaveCount(3); // Still returns cached count
    }

    #endregion

    #region GetPaged Tests

    [Fact]
    public async Task GetPaged_ReturnsCorrectPageSize()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(50);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetPaged(pageNumber: 1, pageSize: 10);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items.Should().HaveCount(10);
        pagedResult.PageNumber.Should().Be(1);
        pagedResult.PageSize.Should().Be(10);
        pagedResult.TotalCount.Should().Be(50);
        pagedResult.TotalPages.Should().Be(5);
    }

    [Fact]
    public async Task GetPaged_ReturnsCorrectPage()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(30);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetPaged(pageNumber: 2, pageSize: 10);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items.Should().HaveCount(10);
        pagedResult.PageNumber.Should().Be(2);
        pagedResult.HasPreviousPage.Should().BeTrue();
        pagedResult.HasNextPage.Should().BeTrue();
    }

    [Fact]
    public async Task GetPaged_LastPageHasCorrectCount()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(25);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetPaged(pageNumber: 3, pageSize: 10);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items.Should().HaveCount(5); // 25 total, page 3 with size 10 = 5 items
        pagedResult.HasNextPage.Should().BeFalse();
    }

    [Fact]
    public async Task GetPaged_ClampsPageSizeToMax100()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(150);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetPaged(pageNumber: 1, pageSize: 500);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items.Should().HaveCount(100); // Clamped to max 100
        pagedResult.PageSize.Should().Be(100);
    }

    [Fact]
    public async Task GetPaged_ReturnsEmptyForPageBeyondData()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(10);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetPaged(pageNumber: 100, pageSize: 10);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items.Should().BeEmpty();
        pagedResult.TotalCount.Should().Be(10);
    }

    [Fact]
    public async Task GetPaged_OrdersByCreatedAtDescending()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(10);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetPaged(pageNumber: 1, pageSize: 5);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        var items = pagedResult.Items;
        items[0].CreatedAt.Should().BeOnOrAfter(items[1].CreatedAt);
        items[1].CreatedAt.Should().BeOnOrAfter(items[2].CreatedAt);
    }

    [Fact]
    public async Task GetPaged_ClampsPageNumberToMin1()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = TestFixture.CreateProducts(10);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetPaged(pageNumber: -5, pageSize: 10);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.PageNumber.Should().Be(1);
        pagedResult.Items.Should().HaveCount(10);
    }

    #endregion

    #region GetByCategoryPaged Tests

    [Fact]
    public async Task GetByCategoryPaged_FiltersAndPaginates()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var electronics = Enumerable.Range(1, 20).Select(i => TestFixture.CreateProduct(i, $"Electronics {i}", "Electronics")).ToList();
        var clothing = Enumerable.Range(21, 10).Select(i => TestFixture.CreateProduct(i, $"Clothing {i}", "Clothing")).ToList();
        await context.Products.AddRangeAsync(electronics.Concat(clothing));
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategoryPaged("Electronics", pageNumber: 1, pageSize: 10);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items.Should().HaveCount(10);
        pagedResult.TotalCount.Should().Be(20);
        pagedResult.Items.Should().AllSatisfy(p => p.Category.Should().Be("Electronics"));
    }

    [Fact]
    public async Task GetByCategoryPaged_IsCaseInsensitive()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = new List<Product>
        {
            TestFixture.CreateProduct(1, "Product 1", "Electronics"),
            TestFixture.CreateProduct(2, "Product 2", "ELECTRONICS"),
            TestFixture.CreateProduct(3, "Product 3", "electronics")
        };
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategoryPaged("ELECTROnics", pageNumber: 1, pageSize: 10);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items.Should().HaveCount(3);
        pagedResult.TotalCount.Should().Be(3);
    }

    [Fact]
    public async Task GetByCategoryPaged_ReturnsOnlyActiveProducts()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var activeProducts = Enumerable.Range(1, 10).Select(i => TestFixture.CreateProduct(i, $"Active {i}", "Electronics")).ToList();
        var inactiveProduct = TestFixture.CreateProduct(11, "Inactive", "Electronics");
        inactiveProduct.IsActive = false;

        await context.Products.AddRangeAsync(activeProducts);
        await context.Products.AddAsync(inactiveProduct);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategoryPaged("Electronics", pageNumber: 1, pageSize: 25);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items.Should().HaveCount(10); // Only active products
        pagedResult.TotalCount.Should().Be(10);
    }

    [Fact]
    public async Task GetByCategoryPaged_ReturnsProductsOrderedByName()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var products = new List<Product>
        {
            TestFixture.CreateProduct(1, "Zebra Product", "Electronics"),
            TestFixture.CreateProduct(2, "Alpha Product", "Electronics"),
            TestFixture.CreateProduct(3, "Middle Product", "Electronics")
        };
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetByCategoryPaged("Electronics", pageNumber: 1, pageSize: 10);

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.Items[0].Name.Should().Be("Alpha Product");
        pagedResult.Items[1].Name.Should().Be("Middle Product");
        pagedResult.Items[2].Name.Should().Be("Zebra Product");
    }

    #endregion

    #region Pagination Cache Tests

    [Fact]
    public async Task GetPaged_UsesCacheOnSecondCall()
    {
        // Arrange
        using var context = _fixture.CreateContext();
        var cache = _fixture.CreateCache();
        var products = TestFixture.CreateProducts(50);
        await context.Products.AddRangeAsync(products);
        await context.SaveChangesAsync();

        var controller = CreateController(context, cache: cache);

        // Act - First call populates cache
        var result1 = await controller.GetPaged(pageNumber: 1, pageSize: 10);

        // Add more products directly to database
        await context.Products.AddAsync(TestFixture.CreateProduct(100, "New Product"));
        await context.SaveChangesAsync();

        // Second call should return cached value
        var result2 = await controller.GetPaged(pageNumber: 1, pageSize: 10);

        // Assert - Total count should still be 50 (cached)
        var okResult2 = result2.Result.Should().BeOfType<OkObjectResult>().Subject;
        var pagedResult = okResult2.Value.Should().BeOfType<PagedResponse<ProductDto>>().Subject;
        pagedResult.TotalCount.Should().Be(50); // Cached value
    }

    #endregion
}
