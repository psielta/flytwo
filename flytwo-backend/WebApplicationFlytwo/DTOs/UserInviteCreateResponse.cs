namespace WebApplicationFlytwo.DTOs;

public class UserInviteCreateResponse : UserInviteResponse
{
    public string Token { get; set; } = string.Empty;
    public string InviteUrl { get; set; } = string.Empty;
}

