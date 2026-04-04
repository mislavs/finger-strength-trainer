using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using TindeqTrainer.Domain.Exceptions;

namespace TindeqTrainer.Api.ExceptionHandlers;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        switch (exception)
        {
            case ValidationException validationException:
                logger.LogInformation(
                    validationException,
                    "Validation failed for {RequestMethod} {RequestPath}",
                    httpContext.Request.Method,
                    httpContext.Request.Path);

                var validationErrors = validationException.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(
                        g => g.Key,
                        g => g.Select(e => e.ErrorMessage).ToArray());

                var validationProblem = new HttpValidationProblemDetails(validationErrors)
                {
                    Status = StatusCodes.Status400BadRequest,
                    Title = "Validation failed."
                };

                AddTraceId(validationProblem, httpContext.TraceIdentifier);
                await WriteProblemResponse(
                    httpContext,
                    validationProblem,
                    StatusCodes.Status400BadRequest,
                    cancellationToken);
                return true;

            case ConflictException conflictException:
                logger.LogWarning(
                    conflictException,
                    "Conflict for {RequestMethod} {RequestPath}: {Message}",
                    httpContext.Request.Method,
                    httpContext.Request.Path,
                    conflictException.Message);

                var conflictProblem = new ProblemDetails
                {
                    Status = StatusCodes.Status409Conflict,
                    Title = conflictException.Message
                };

                AddTraceId(conflictProblem, httpContext.TraceIdentifier);
                await WriteProblemResponse(
                    httpContext,
                    conflictProblem,
                    StatusCodes.Status409Conflict,
                    cancellationToken);
                return true;

            case NotFoundException notFoundException:
                logger.LogWarning(
                    notFoundException,
                    "Resource not found for {RequestMethod} {RequestPath}: {Message}",
                    httpContext.Request.Method,
                    httpContext.Request.Path,
                    notFoundException.Message);

                var notFoundProblem = new ProblemDetails
                {
                    Status = StatusCodes.Status404NotFound,
                    Title = notFoundException.Message
                };

                AddTraceId(notFoundProblem, httpContext.TraceIdentifier);
                await WriteProblemResponse(
                    httpContext,
                    notFoundProblem,
                    StatusCodes.Status404NotFound,
                    cancellationToken);
                return true;

            default:
                logger.LogError(
                    exception,
                    "Unhandled exception for {RequestMethod} {RequestPath}",
                    httpContext.Request.Method,
                    httpContext.Request.Path);

                var unexpectedProblem = new ProblemDetails
                {
                    Status = StatusCodes.Status500InternalServerError,
                    Title = "An unexpected error occurred."
                };

                AddTraceId(unexpectedProblem, httpContext.TraceIdentifier);
                await WriteProblemResponse(
                    httpContext,
                    unexpectedProblem,
                    StatusCodes.Status500InternalServerError,
                    cancellationToken);
                return true;
        }
    }

    private static Task WriteProblemResponse(
        HttpContext context,
        object problemDetails,
        int statusCode,
        CancellationToken cancellationToken)
    {
        context.Response.StatusCode = statusCode;
        return context.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
    }

    private static void AddTraceId(ProblemDetails problemDetails, string traceIdentifier)
    {
        problemDetails.Extensions["traceId"] = traceIdentifier;
    }
}
