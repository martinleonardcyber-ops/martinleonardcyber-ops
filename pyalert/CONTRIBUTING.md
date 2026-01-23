# Contributing to PyAlert

Thank you for your interest in contributing to PyAlert! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/pyalert.git`
3. Create a virtual environment: `python -m venv venv`
4. Activate it: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
5. Install development dependencies: `pip install -e ".[dev]"`

## Development Workflow

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run tests: `pytest tests/`
4. Run linting: `black src/pyalert tests && ruff check src/pyalert tests`
5. Commit your changes: `git commit -m "Description of changes"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Code Style

- Follow PEP 8 guidelines
- Use Black for code formatting (line length: 100)
- Use Ruff for linting
- Add type hints where applicable
- Write docstrings for all public functions and classes

## Testing

- Write tests for new features
- Ensure all tests pass before submitting PR
- Aim for high test coverage
- Use pytest for testing

## Pull Request Guidelines

- Provide a clear description of the changes
- Link any related issues
- Ensure CI/CD passes
- Update documentation if needed
- Add your name to contributors if you'd like

## Adding New Providers

To add a new notification provider:

1. Create a new file in `src/pyalert/providers/`
2. Implement a provider class with a `send(alert)` method
3. Add it to `src/pyalert/providers/__init__.py`
4. Add a corresponding `to_<provider>()` method in `Alert` class
5. Write tests in `tests/test_providers.py`
6. Update README.md with usage examples

## Questions?

Feel free to open an issue for any questions or discussions!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
