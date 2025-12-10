using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Swashbuckle.AspNetCore.Annotations;
using WebApplicationFlytwo.Data;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;
using ZiggyCreatures.Caching.Fusion;

namespace WebApplicationFlytwo.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProductController : BaseApiController
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IFusionCache _cache;
    private readonly ILogger<ProductController> _logger;

    private const string CacheKeyAllProducts = "products:all";
    private const string CacheKeyProductById = "product:{0}";
    private const string CacheKeyProductsByCategory = "products:category:{0}";
    private const string CacheKeyProductsPage = "products:page:{0}:{1}";
    private const string CacheKeyProductsCount = "products:count";
    private const string CacheKeyProductsCategoryPage = "products:category:{0}:page:{1}:{2}";
    private const string CacheKeyProductsCategoryCount = "products:category:{0}:count";

    public ProductController(
        AppDbContext context,
        IMapper mapper,
        IFusionCache cache,
        ILogger<ProductController> logger)
    {
        _context = context;
        _mapper = mapper;
        _cache = cache;
        _logger = logger;
    }

    [HttpGet]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Get all products (cached)")]
    [ProducesResponseType(typeof(IEnumerable<ProductDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetAll()
    {
        _logger.LogInformation("Getting all products");

        var products = await _cache.GetOrSetAsync(
            CacheKeyAllProducts,
            async ct =>
            {
                _logger.LogInformation("Cache miss for all products - fetching from database");
                return await _context.Products
                    .AsNoTracking()
                    .OrderByDescending(p => p.CreatedAt)
                    .ToListAsync(ct);
            }
        );

        return Ok(_mapper.Map<IEnumerable<ProductDto>>(products));
    }

    [HttpGet("paged")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Get products with pagination (cached)")]
    [ProducesResponseType(typeof(PagedResponse<ProductDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<ProductDto>>> GetPaged(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25)
    {
        _logger.LogInformation("Getting products page {PageNumber} with size {PageSize}", pageNumber, pageSize);

        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var totalCount = await _cache.GetOrSetAsync(
            CacheKeyProductsCount,
            async ct =>
            {
                _logger.LogInformation("Cache miss for products count - fetching from database");
                return await _context.Products.CountAsync(ct);
            }
        );

        var cacheKey = string.Format(CacheKeyProductsPage, pageNumber, pageSize);
        var products = await _cache.GetOrSetAsync(
            cacheKey,
            async ct =>
            {
                _logger.LogInformation("Cache miss for products page {PageNumber} - fetching from database", pageNumber);
                return await _context.Products
                    .AsNoTracking()
                    .OrderByDescending(p => p.CreatedAt)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync(ct);
            }
        );

        return Ok(new PagedResponse<ProductDto>
        {
            Items = _mapper.Map<List<ProductDto>>(products),
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        });
    }

    [HttpGet("{id}")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Get product by id (cached)")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> GetById(int id)
    {
        _logger.LogInformation("Getting product with id {Id}", id);

        var product = await _cache.GetOrSetAsync(
            string.Format(CacheKeyProductById, id),
            async ct =>
            {
                _logger.LogInformation("Cache miss for product {Id} - fetching from database", id);
                return await _context.Products.FindAsync(new object[] { id }, ct);
            }
        );

        if (product == null)
        {
            _logger.LogWarning("Product with id {Id} not found", id);
            return NotFound();
        }

        return Ok(_mapper.Map<ProductDto>(product));
    }

    [HttpGet("category/{category}")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Get products by category (cached)")]
    [ProducesResponseType(typeof(IEnumerable<ProductDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetByCategory(string category)
    {
        _logger.LogInformation("Getting products by category {Category}", category);

        var products = await _cache.GetOrSetAsync(
            string.Format(CacheKeyProductsByCategory, category.ToLower()),
            async ct =>
            {
                _logger.LogInformation("Cache miss for category {Category} - fetching from database", category);
                return await _context.Products
                    .AsNoTracking()
                    .Where(p => p.Category.ToLower() == category.ToLower() && p.IsActive)
                    .OrderBy(p => p.Name)
                    .ToListAsync(ct);
            }
        );

        return Ok(_mapper.Map<IEnumerable<ProductDto>>(products));
    }

    [HttpGet("category/{category}/paged")]
    [AllowAnonymous]
    [SwaggerOperation(Summary = "Get products by category with pagination (cached)")]
    [ProducesResponseType(typeof(PagedResponse<ProductDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<ProductDto>>> GetByCategoryPaged(
        string category,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 25)
    {
        _logger.LogInformation("Getting products in category {Category} page {PageNumber} with size {PageSize}",
            category, pageNumber, pageSize);

        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var categoryLower = category.ToLower();

        var countCacheKey = string.Format(CacheKeyProductsCategoryCount, categoryLower);
        var totalCount = await _cache.GetOrSetAsync(
            countCacheKey,
            async ct =>
            {
                _logger.LogInformation("Cache miss for category {Category} count - fetching from database", category);
                return await _context.Products
                    .Where(p => p.Category.ToLower() == categoryLower && p.IsActive)
                    .CountAsync(ct);
            }
        );

        var pageCacheKey = string.Format(CacheKeyProductsCategoryPage, categoryLower, pageNumber, pageSize);
        var products = await _cache.GetOrSetAsync(
            pageCacheKey,
            async ct =>
            {
                _logger.LogInformation("Cache miss for category {Category} page {PageNumber} - fetching from database",
                    category, pageNumber);
                return await _context.Products
                    .AsNoTracking()
                    .Where(p => p.Category.ToLower() == categoryLower && p.IsActive)
                    .OrderBy(p => p.Name)
                    .Skip((pageNumber - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync(ct);
            }
        );

        return Ok(new PagedResponse<ProductDto>
        {
            Items = _mapper.Map<List<ProductDto>>(products),
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount
        });
    }

    [HttpPost]
    [SwaggerOperation(Summary = "Create a new product")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductRequest request)
    {
        _logger.LogInformation("Creating new product with name: {Name}", request.Name);

        // Check for duplicate SKU
        var existingSku = await _context.Products.AnyAsync(p => p.Sku == request.Sku);
        if (existingSku)
        {
            _logger.LogWarning("Product with SKU {Sku} already exists", request.Sku);
            return BadRequest(new { message = $"Product with SKU '{request.Sku}' already exists" });
        }

        var product = _mapper.Map<Product>(request);
        product.CreatedAt = DateTime.UtcNow;
        product.IsActive = true;

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        // Invalidate list caches
        await InvalidateListCaches(product.Category);

        _logger.LogInformation("Created product with id {Id}", product.Id);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, _mapper.Map<ProductDto>(product));
    }

    [HttpPut("{id}")]
    [SwaggerOperation(Summary = "Update an existing product")]
    [ProducesResponseType(typeof(ProductDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProductDto>> Update(int id, [FromBody] UpdateProductRequest request)
    {
        _logger.LogInformation("Updating product with id {Id}", id);

        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            _logger.LogWarning("Product with id {Id} not found for update", id);
            return NotFound();
        }

        var oldCategory = product.Category;

        product.Name = request.Name;
        product.Description = request.Description;
        product.Category = request.Category;
        product.Price = request.Price;
        product.StockQuantity = request.StockQuantity;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        // Invalidate caches
        await _cache.RemoveAsync(string.Format(CacheKeyProductById, id));
        await InvalidateListCaches(oldCategory);
        if (oldCategory != request.Category)
        {
            await InvalidateListCaches(request.Category);
        }

        _logger.LogInformation("Updated product with id {Id}", id);
        return Ok(_mapper.Map<ProductDto>(product));
    }

    [HttpDelete("{id}")]
    [SwaggerOperation(Summary = "Delete a product")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Delete(int id)
    {
        _logger.LogInformation("Deleting product with id {Id}", id);

        var product = await _context.Products.FindAsync(id);

        if (product == null)
        {
            _logger.LogWarning("Product with id {Id} not found for deletion", id);
            return NotFound();
        }

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        // Invalidate caches
        await _cache.RemoveAsync(string.Format(CacheKeyProductById, id));
        await InvalidateListCaches(product.Category);

        _logger.LogInformation("Deleted product with id {Id}", id);
        return NoContent();
    }

    private async Task InvalidateListCaches(string category)
    {
        _logger.LogDebug("Invalidating cache for category {Category} and all products", category);

        // Invalidate legacy caches
        await _cache.RemoveAsync(CacheKeyAllProducts);
        await _cache.RemoveAsync(string.Format(CacheKeyProductsByCategory, category.ToLower()));

        // Invalidate count caches (pagination)
        await _cache.RemoveAsync(CacheKeyProductsCount);
        await _cache.RemoveAsync(string.Format(CacheKeyProductsCategoryCount, category.ToLower()));

        // Page caches expire via TTL (5 min)
    }
}
