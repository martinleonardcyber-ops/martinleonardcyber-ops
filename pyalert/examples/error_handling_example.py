"""Error handling and monitoring example."""

import traceback
from pyalert import Alert, Severity

DISCORD_WEBHOOK = "https://discord.com/api/webhooks/YOUR_WEBHOOK_HERE"


def risky_operation():
    """Simulate a function that might fail."""
    # This will raise an error
    result = 10 / 0
    return result


def monitored_function(func):
    """Decorator to monitor function execution."""
    def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)

            # Success notification
            Alert(
                f"Function '{func.__name__}' executed successfully",
                severity=Severity.SUCCESS
            ).to_discord(DISCORD_WEBHOOK).send()

            return result

        except Exception as e:
            # Error notification
            error_msg = str(e)
            trace = traceback.format_exc()

            alert = Alert(
                message=f"Function '{func.__name__}' failed!",
                title="Error Alert",
                severity=Severity.ERROR
            )

            alert.add_field("Error", error_msg[:100], inline=False) \
                 .add_field("Function", func.__name__) \
                 .add_field("Traceback", trace[:200], inline=False) \
                 .to_discord(DISCORD_WEBHOOK) \
                 .send()

            raise

    return wrapper


@monitored_function
def example_function():
    """Example function that will fail."""
    return risky_operation()


if __name__ == "__main__":
    try:
        example_function()
    except Exception:
        print("Error caught and alert sent!")
