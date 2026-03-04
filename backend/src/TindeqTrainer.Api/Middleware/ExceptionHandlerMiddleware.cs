using System.Net;
using System.Text.Json;
using FluentValidation;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Api.Middleware;

public class ExceptionHandlerMiddleware(
    RequestDelegate _next,
    ILogger<ExceptionHandlerMiddleware> _logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            _logger.LogInformation(
                ex,
                "Validation failed for {RequestMethod} {RequestPath}",
                context.Request.Method,
                context.Request.Path);
            await WriteValidationResponse(context, ex);
        }
        catch (NotFoundException ex)
        {
            _logger.LogWarning(
                ex,
                "Resource not found for {RequestMethod} {RequestPath}: {Message}",
                context.Request.Method,
                context.Request.Path,
                ex.Message);
            await WriteErrorResponse(context, HttpStatusCode.NotFound, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Unhandled exception for {RequestMethod} {RequestPath}",
                context.Request.Method,
                context.Request.Path);
            await WriteErrorResponse(
                context,
                HttpStatusCode.InternalServerError,
                "An unexpected error occurred.");
        }
    }

    private static async Task WriteValidationResponse(
        HttpContext context,
        ValidationException exception)
    {
        var errors = exception.Errors
            .GroupBy(e => e.PropertyName)
            .ToDictionary(
                g => g.Key,
                g => g.Select(e => e.ErrorMessage).ToArray());

        var response = new ErrorResponse("Validation failed.", errors);
        await WriteJsonResponse(context, HttpStatusCode.BadRequest, response);
    }

    private static Task WriteErrorResponse(
        HttpContext context,
        HttpStatusCode statusCode,
        string message)
    {
        var response = new ErrorResponse(message, null);
        return WriteJsonResponse(context, statusCode, response);
    }

    private static Task WriteJsonResponse(
        HttpContext context,
        HttpStatusCode statusCode,
        ErrorResponse response)
    {
        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";
        var json = JsonSerializer.Serialize(response);
        return context.Response.WriteAsync(json);
    }

    private sealed record ErrorResponse(string Message, Dictionary<string, string[]>? Errors);
}
