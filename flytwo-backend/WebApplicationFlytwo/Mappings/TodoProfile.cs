using AutoMapper;
using WebApplicationFlytwo.DTOs;
using WebApplicationFlytwo.Entities;

namespace WebApplicationFlytwo.Mappings;

public class TodoProfile : Profile
{
    public TodoProfile()
    {
        CreateMap<Todo, TodoDto>();
        CreateMap<CreateTodoRequest, Todo>();
        CreateMap<UpdateTodoRequest, Todo>();
    }
}
