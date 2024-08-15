# PostmanxGithub Action Automatic Sync

This repository provides a script to automate the process of adding a Postman collection to a GitHub Actions workflow. The script supports both existing and new repositories and allows users to use a custom YAML template for the GitHub Actions workflow.

## Features

- Export Postman collections using a UID or from a local file.
- Automatically add the Postman collection to a GitHub repository.
- Create or update GitHub Actions workflows.
- Use a custom YAML template for the GitHub Actions workflow.
- Supports both new and existing repositories.

## Prerequisites

- Python 3.x
- GitHub personal access token
- Postman API key (if exporting collection by UID)
- There is a test collection to try it out for yourself

### Getting Your GitHub Personal Access Token

1. Go to [GitHub Settings](https://github.com/settings/tokens).
2. Click **Generate new token**.
3. Select the scopes you need (at least `repo` and `workflow`).
4. Click **Generate token**.
5. Copy the token and save it securely. You will need it to run the script.

### Getting Your Postman API Key

1. Go to [Postman API Keys](https://go.postman.co/settings/me/api-keys).
2. Click **Generate API Key**.
3. Enter a name for your key and click **Generate API Key**.
4. Copy the key and save it securely. You will need it to export collections by UID.

### Exporting Tokens to Environment Variables

To make the tokens available to the script, you should export them to your environment variables. This can be done by adding the following lines to your shell configuration file (e.g., `~/.bashrc` or `~/.zshrc`).

#### For Bash

```bash
export GITHUB_TOKEN=your_github_token_here
export POSTMAN_API_KEY=your_postman_api_key_here
```

After adding these lines, source the file to update your environment variables:

```bash
source ~/.bashrc
```

#### For Zsh

```bash
export GITHUB_TOKEN=your_github_token_here
export POSTMAN_API_KEY=your_postman_api_key_here
```

After adding these lines, source the file to update your environment variables:

```bash
source ~/.zshrc
```

## Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/BlazinArtemis/project-work.git
   cd project-work
   ```

2. Install the required Python packages:

   ```bash
   pip install requests argparse
   ```

## Usage

### Basic Usage

To run the script and add a Postman collection to a GitHub Actions workflow, use the following command:

```bash
python main.py
```

### Using a Custom YAML Template

To use a custom YAML template for the GitHub Actions workflow, use the `--template` argument:

```bash
python main.py --template path/to/template.yml
```

**Note**: If using a custom template and exporting the collection by UID, ensure that the collection is saved as `collection.json`. If using a file, ensure the file name matches the template.

### Options

- **GitHub Token**: The script will check for the GitHub token in the environment variable `GITHUB_TOKEN`. If not found, it will prompt you to enter it and save it to your environment.

- **Postman Collection Source**: You can choose to export the Postman collection using a UID or from a local file. If using a file, move the file to the directory from which you are running the script, and ensure the path does not start with `/`.

- **Repository Type**: The script supports both new and existing repositories.

### Example

1. **Run the Script**:

   ```bash
   python main.py --template my-custom-template.yml
   ```

2. **Follow the Prompts**:
   - Enter your GitHub token.
   - Choose the Postman collection source (UID or file).
   - If using a UID, enter the Postman API key and the collection ID.
   - If using a file, enter the path to the Postman collection JSON file.
   - Choose whether to use an existing or new GitHub repository.
   - If using an existing repository, enter the repository name (e.g., `username/repo`).
   - If using a new repository, enter the repository name, and the script will create it for you.

## Contributing

Contributions are welcome! Please fork the repository and use a feature branch. Pull requests are warmly welcome.

## License

This project is licensed under the MIT License.

## Contact

For any inquiries or issues, please open an issue on the GitHub repository.
```

