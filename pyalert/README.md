# 🚨 PyAlert

> Send beautiful alerts to Discord, Slack, Telegram and more with just **one line of code**

[![PyPI version](https://badge.fury.io/py/pyalert.svg)](https://badge.fury.io/py/pyalert)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Downloads](https://pepy.tech/badge/pyalert)](https://pepy.tech/project/pyalert)

Stop wasting time integrating different notification APIs. **PyAlert** gives you a unified, dead-simple way to send alerts everywhere.

---

## ✨ Features

- 🎯 **One-liner alerts** - Send notifications in a single line
- 🎨 **Beautiful embeds** - Rich formatting with colors and fields
- 🔗 **Multi-platform** - Discord, Slack, Telegram (more coming!)
- ⚡ **Method chaining** - Fluent API for easy configuration
- 🎭 **Severity levels** - Success, Info, Warning, Error, Critical
- 🧩 **Zero config** - Works out of the box
- 🪶 **Lightweight** - Only `requests` as dependency

---

## 🚀 Quick Start

### Installation

```bash
pip install pyalert
```

### Basic Usage

```python
from pyalert import Alert, Severity

# Send a simple alert to Discord
Alert("Server is down!", severity=Severity.CRITICAL) \
    .to_discord("https://discord.com/api/webhooks/YOUR_WEBHOOK") \
    .send()
```

That's it! 🎉

---

## 💡 Examples

### Discord Alert with Fields

```python
from pyalert import Alert, Severity

alert = Alert(
    message="High memory usage detected!",
    title="System Alert",
    severity=Severity.WARNING
)

alert.add_field("Server", "api-prod-01") \
     .add_field("Memory Usage", "89%") \
     .add_field("CPU Usage", "76%") \
     .to_discord("YOUR_WEBHOOK_URL") \
     .send()
```

### Send to Multiple Platforms

```python
from pyalert import Alert, Severity

alert = Alert("Deployment completed successfully!", severity=Severity.SUCCESS)

# Send to Discord, Slack AND Telegram at once!
alert.to_discord("DISCORD_WEBHOOK") \
     .to_slack("SLACK_WEBHOOK") \
     .to_telegram("BOT_TOKEN", "CHAT_ID") \
     .send()
```

### Error Monitoring

```python
from pyalert import Alert, Severity

try:
    # Your code here
    risky_operation()
except Exception as e:
    Alert(f"Critical error: {str(e)}", severity=Severity.ERROR) \
        .add_field("Function", "risky_operation") \
        .add_field("Traceback", str(e)[:100]) \
        .to_discord("YOUR_WEBHOOK") \
        .send()
```

### Severity Levels

```python
from pyalert import Alert, Severity

# Success (Green)
Alert("Backup completed", severity=Severity.SUCCESS).to_discord(url).send()

# Info (Blue)
Alert("User logged in", severity=Severity.INFO).to_discord(url).send()

# Warning (Orange)
Alert("High CPU usage", severity=Severity.WARNING).to_discord(url).send()

# Error (Red)
Alert("Database connection failed", severity=Severity.ERROR).to_discord(url).send()

# Critical (Dark Red)
Alert("System breach detected!", severity=Severity.CRITICAL).to_discord(url).send()
```

---

## 🎨 Severity Colors

| Severity | Color | Emoji | Use Case |
|----------|-------|-------|----------|
| `SUCCESS` | 🟢 Green | ✅ | Successful operations |
| `INFO` | 🔵 Blue | ℹ️ | General information |
| `WARNING` | 🟠 Orange | ⚠️ | Warnings, high usage |
| `ERROR` | 🔴 Red | ❌ | Errors, failures |
| `CRITICAL` | 🔴 Dark Red | 🚨 | Critical issues, security |

---

## 🔧 Platform Setup

### Discord
1. Go to Server Settings → Integrations → Webhooks
2. Click "New Webhook"
3. Copy the webhook URL
4. Use it in PyAlert:
```python
.to_discord("https://discord.com/api/webhooks/YOUR_WEBHOOK_URL")
```

### Slack
1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable Incoming Webhooks
3. Create a webhook for your workspace
4. Use it in PyAlert:
```python
.to_slack("https://hooks.slack.com/services/YOUR_WEBHOOK_URL")
```

### Telegram
1. Create a bot with [@BotFather](https://t.me/botfather)
2. Get your bot token
3. Get your chat ID (send a message to your bot, then visit `https://api.telegram.org/botYOUR_TOKEN/getUpdates`)
4. Use it in PyAlert:
```python
.to_telegram("YOUR_BOT_TOKEN", "YOUR_CHAT_ID")
```

---

## 📚 API Reference

### `Alert(message, title=None, severity=Severity.INFO, fields=None)`

Create a new alert.

**Parameters:**
- `message` (str): Main alert message
- `title` (str, optional): Alert title (default: "ℹ️ Alert")
- `severity` (Severity, optional): Alert severity level
- `fields` (dict, optional): Dictionary of field name → value pairs

**Methods:**
- `.add_field(name, value, inline=True)` - Add a field to the alert
- `.to_discord(webhook_url)` - Add Discord as destination
- `.to_slack(webhook_url)` - Add Slack as destination
- `.to_telegram(bot_token, chat_id)` - Add Telegram as destination
- `.send()` - Send the alert to all configured platforms

---

## 🛠️ Use Cases

- 🔐 **Security Monitoring** - Alert on suspicious activities
- 📊 **Server Monitoring** - CPU, RAM, disk usage alerts
- 🚀 **CI/CD Pipelines** - Build and deployment notifications
- 💰 **E-commerce** - New orders, payment failures
- 🤖 **Automation** - Script completion, error notifications
- 📈 **Analytics** - Threshold alerts, anomaly detection

---

## 🗺️ Roadmap

- [ ] Email provider (SMTP)
- [ ] Microsoft Teams provider
- [ ] PagerDuty integration
- [ ] Webhook retry logic
- [ ] Rate limiting
- [ ] Alert templates
- [ ] Attachment support (images, files)
- [ ] Async support

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest features
- 🔧 Submit pull requests

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details

---

## 💬 Support

- 🐛 [Report Issues](https://github.com/martinleonardcyber-ops/pyalert/issues)
- 💡 [Request Features](https://github.com/martinleonardcyber-ops/pyalert/issues)
- ⭐ Star this repo if you find it useful!

---

<div align="center">

**Made with ❤️ by [Léo](https://github.com/martinleonardcyber-ops)**

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://www.buymeacoffee.com/martinleo)

</div>
