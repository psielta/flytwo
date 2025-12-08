using AutoMapper;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Mappings;

public class ProductProfile : Profile
{
    public ProductProfile()
    {
        CreateMap<Product, ProductDto>();
        CreateMap<CreateProductRequest, Product>();
        CreateMap<UpdateProductRequest, Product>();
    }
}
