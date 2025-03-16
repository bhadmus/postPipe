#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import inquirer from "inquirer";
import { config } from "dotenv";
import {
  generateYaml,
  makeCommit,
  exportPostmanCollection,
  createRepo,
  verifyGithubActionsWorkflow,
  initializeRepoWithReadme,
  readmeExists,
  createAndInstallPackageJson,
  exportPostmanEnvironment,
  moveJsonFile,
} from "./src/helperFunctions.mjs";

// Load environment variables
config();

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use path.resolve to construct the correct file path
const packageJsonPath = path.resolve(__dirname, "package.json");

// Create a root folder to collect the collection and environment

const requestDir = [
  path.join(process.cwd(), "endpoints", "collection"),
  path.join(process.cwd(), "endpoints", "environment"),
];

for (const dir of requestDir) {
  fs.ensureDir(dir);
}

// Read the package.json file
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-V")) {
  console.log(`Version: ${version}`);
  process.exit(0);
}

async function startProcess(versionChoice) {
  let versionToken;
  switch (versionChoice) {
    case "GitHub":
      versionToken = process.env.GITHUB_TOKEN;
      if (!versionToken) {
        const { token } = await inquirer.prompt({
          type: "input",
          name: "token",
          message: "Enter your GitHub token:",
        });
        versionToken = token;
        process.env.GITHUB_TOKEN = versionToken;
        fs.appendFileSync(
          path.resolve(process.env.HOME, ".bashrc"),
          `\nexport GITHUB_TOKEN=${versionToken}\n`
        );
      }
      break;
    case "Gitlab":
      versionToken = process.env.GITLAB_TOKEN;
      if (!versionToken) {
        const { token } = await inquirer.prompt({
          type: "input",
          name: "token",
          message: "Enter your Gitlab token:",
        });
        versionToken = token;
        process.env.GITLAB_TOKEN = versionToken;
        fs.appendFileSync(
          path.resolve(process.env.HOME, ".bashrc"),
          `\nexport GITLAB_TOKEN=${versionToken}\n`
        );
      }
      break;
    case "Bitbucket":
      versionToken = process.env.BITBUCKET_TOKEN;
      if (!versionToken) {
        const { token } = await inquirer.prompt({
          type: "input",
          name: "token",
          message: "Enter your Bitbucket token:",
        });
        versionToken = token;
        process.env.BITBUCKET_TOKEN = versionToken;
        fs.appendFileSync(
          path.resolve(process.env.HOME, ".bashrc"),
          `\nexport BITBUCKET_TOKEN=${versionToken}\n`
        );
      }
  }

  const { environmentRequired } = await inquirer.prompt({
    type: "confirm",
    name: "environmentRequired",
    message: "Does the Postman collection need an environment?",
    default: false,
  });

  const { collectionSource } = await inquirer.prompt({
    type: "list",
    name: "collectionSource",
    message: "Is the Postman collection from UID or filepath?",
    choices: ["UID", "filepath"],
    default: "UID",
  });

  let collectionFilePath;
  let environmentFilePath;
  // let rootCollectionFilePath;
  // let rootEnvironmentFilePath;

  if (!environmentRequired) {
    if (collectionSource === "UID") {
      let postmanApiKey = process.env.POSTMAN_API_KEY;
      if (!postmanApiKey) {
        const { apiKey } = await inquirer.prompt({
          type: "input",
          name: "apiKey",
          message: "Enter your Postman API key:",
        });
        postmanApiKey = apiKey;
        process.env.POSTMAN_API_KEY = postmanApiKey;
        fs.appendFileSync(
          path.resolve(process.env.HOME, ".bashrc"),
          `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
        );
      }
      const { collectionId } = await inquirer.prompt({
        type: "input",
        name: "collectionId",
        message: "Enter the Postman collection ID:",
      });
      collectionFilePath = path.join(
        process.cwd(),
        "endpoints",
        "collection",
        "collection.json"
      );
      await exportPostmanCollection(
        postmanApiKey,
        collectionId,
        collectionFilePath
      );
    } else if (collectionSource === "filepath") {
      const { filePath } = await inquirer.prompt({
        type: "input",
        name: "filePath",
        message: "Enter the path to the Postman collection JSON file:",
      });
      collectionFilePath = moveJsonFile(
        filePath,
        path.join(process.cwd(), "endpoints", "collection")
      );
    } else {
      console.log("Invalid option. Exiting.");
      return;
    }
  } else {
    const { environmentSource } = await inquirer.prompt({
      type: "list",
      name: "environmentSource",
      message: "Is the Postman environment from UID or filepath?",
      choices: ["UID", "filepath"],
      default: "UID",
    });
    if (environmentSource === "UID" && collectionSource === "UID") {
      let postmanApiKey = process.env.POSTMAN_API_KEY;
      if (!postmanApiKey) {
        const { apiKey } = await inquirer.prompt({
          type: "input",
          name: "apiKey",
          message: "Enter your Postman API key:",
        });
        postmanApiKey = apiKey;
        process.env.POSTMAN_API_KEY = postmanApiKey;
        fs.appendFileSync(
          path.resolve(process.env.HOME, ".bashrc"),
          `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
        );
      }
      const { collectionId } = await inquirer.prompt({
        type: "input",
        name: "collectionId",
        message: "Enter the Postman collection ID:",
      });
      collectionFilePath = path.join(
        process.cwd(),
        "endpoints",
        "collection",
        "collection.json"
      );
      const { environmentId } = await inquirer.prompt({
        type: "input",
        name: "environmentId",
        message: "Enter the Postman environment ID:",
      });
      environmentFilePath = path.join(
        process.cwd(),
        "endpoints",
        "collection",
        "environment.json"
      );
      await exportPostmanCollection(
        postmanApiKey,
        collectionId,
        collectionFilePath
      );
      await exportPostmanEnvironment(
        postmanApiKey,
        environmentId,
        environmentFilePath
      );
    } else if (
      environmentSource === "filepath" &&
      collectionSource === "filepath"
    ) {
      const { filePath } = await inquirer.prompt({
        type: "input",
        name: "filePath",
        message: "Enter the path to the Postman collection JSON file:",
      });
      collectionFilePath = moveJsonFile(filePath, path.join(process.cwd(), 'endpoints', 'collection'));
      const { envPath } = await inquirer.prompt({
        type: "input",
        name: "envPath",
        message: "Enter the path to the Postman environment JSON file:",
      });
      environmentFilePath = moveJsonFile(envPath, path.join(process.cwd(), 'endpoints', 'environment'));
    } else if (environmentSource === "filepath" && collectionSource === "UID") {
      let postmanApiKey = process.env.POSTMAN_API_KEY;
      if (!postmanApiKey) {
        const { apiKey } = await inquirer.prompt({
          type: "input",
          name: "apiKey",
          message: "Enter your Postman API key:",
        });
        postmanApiKey = apiKey;
        process.env.POSTMAN_API_KEY = postmanApiKey;
        fs.appendFileSync(
          path.resolve(process.env.HOME, ".bashrc"),
          `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
        );
      }
      const { collectionId } = await inquirer.prompt({
        type: "input",
        name: "collectionId",
        message: "Enter the Postman collection ID:",
      });
      collectionFilePath = path.join(
        process.cwd(),
        "endpoints",
        "collection",
        "collection.json"
      );
      const { envPath } = await inquirer.prompt({
        type: "input",
        name: "envPath",
        message: "Enter the path to the Postman environment JSON file:",
      });
      environmentFilePath = moveJsonFile(envPath, path.join(process.cwd(), 'endpoints', 'environment'));
      await exportPostmanCollection(
        postmanApiKey,
        collectionId,
        collectionFilePath
      );
    } else if (environmentSource === "UID" && collectionSource === "filepath") {
      let postmanApiKey = process.env.POSTMAN_API_KEY;
      if (!postmanApiKey) {
        const { apiKey } = await inquirer.prompt({
          type: "input",
          name: "apiKey",
          message: "Enter your Postman API key:",
        });
        postmanApiKey = apiKey;
        process.env.POSTMAN_API_KEY = postmanApiKey;
        fs.appendFileSync(
          path.resolve(process.env.HOME, ".bashrc"),
          `\nexport POSTMAN_API_KEY=${postmanApiKey}\n`
        );
      }
      const { filePath } = await inquirer.prompt({
        type: "input",
        name: "filePath",
        message: "Enter the path to the Postman collection JSON file:",
      });
      collectionFilePath = moveJsonFile(filePath, path.join(process.cwd(), 'endpoints', 'collection'));
      const { environmentId } = await inquirer.prompt({
        type: "input",
        name: "environmentId",
        message: "Enter the Postman environment ID:",
      });
      environmentFilePath = path.join(
        process.cwd(),
        "endpoints",
        "collection",
        "environment.json"
      );
      await exportPostmanEnvironment(
        postmanApiKey,
        environmentId,
        environmentFilePath
      );
    }
  }

  if (!fs.existsSync(collectionFilePath)) {
    throw new Error("Collection file not found. Exiting.");
  }

  const { repoChoice } = await inquirer.prompt({
    type: "list",
    name: "repoChoice",
    message: "Is it an existing or new repository?",
    choices: ["existing", "new"],
    default: "new",
  });

  let repoFullName;
  if (repoChoice === "existing") {
    const { repoName } = await inquirer.prompt({
      type: "input",
      name: "repoName",
      message: "Enter the full repository name (e.g., username/repo):",
    });
    repoFullName = repoName;
    switch (versionChoice) {
      case "GitHub":
      case "Gitlab":
      case "Bitbucket":
        if (!(await readmeExists(versionChoice, versionToken, repoFullName))) {
          if (
            !(await initializeRepoWithReadme(
              versionChoice,
              versionToken,
              repoFullName
            ))
          ) {
            return;
          }
        }
        break;
    }
  } else if (repoChoice === "new") {
    const { repoName } = await inquirer.prompt({
      type: "input",
      name: "repoName",
      message: "Enter the repository name:",
    });
    repoFullName = await createRepo(versionChoice, versionToken, repoName);
    if (!repoFullName) {
      console.log("Failed to create the repository. Exiting.");
      return;
    }
    if (
      !(await initializeRepoWithReadme(
        versionChoice,
        versionToken,
        repoFullName
      ))
    ) {
      return;
    }
  } else {
    console.log("Invalid option. Exiting.");
    return;
  }

  let outputYamlFilePath;
  switch (versionChoice) {
    case "GitHub":
      const githubDir = path.resolve(process.cwd(), ".github", "workflows");
      fs.ensureDirSync(githubDir);
      outputYamlFilePath = path.resolve(githubDir, "postman-tests.yml");
      break;
    case "Gitlab":
      outputYamlFilePath = path.resolve(process.cwd(), ".gitlab-ci.yml");
      break;
    case "Bitbucket":
      outputYamlFilePath = path.resolve(
        process.cwd(),
        "bitbucket-pipelines.yml"
      );
  }
  const relativeCollectionPath = path.relative(process.cwd(), collectionFilePath).replace(/\\/g, "/");
  const relativeEnvironmentPath = environmentFilePath
    ? path.relative(process.cwd(), environmentFilePath).replace(/\\/g, "/")
    : null;

  generateYaml(
    versionChoice,
    relativeCollectionPath,
    relativeEnvironmentPath,
    outputYamlFilePath
  );

  if (!fs.existsSync(outputYamlFilePath)) {
    throw new Error("YAML file not found. Exiting.");
  }

  const projectDir = process.cwd();
  createAndInstallPackageJson(projectDir, { collectionFilePath });

  if (
    !fs.existsSync(path.resolve(projectDir, "package.json")) ||
    !fs.existsSync(path.resolve(projectDir, "package-lock.json"))
  ) {
    throw new Error("package.json or package-lock.json not found. Exiting.");
  }

  let commitFiles;
  if (environmentFilePath) {
    commitFiles = [
      outputYamlFilePath,
      collectionFilePath,
      environmentFilePath,
      path.resolve(projectDir, "package.json"),
      path.resolve(projectDir, "package-lock.json"),
    ];
  } else {
    commitFiles = [
      outputYamlFilePath,
      collectionFilePath,
      path.resolve(projectDir, "package.json"),
      path.resolve(projectDir, "package-lock.json"),
    ];
  }
  const commitMessage = "Create Pipeline Config";
  await makeCommit(
    versionChoice,
    versionToken,
    repoFullName,
    commitFiles,
    commitMessage
  );

  if (versionChoice === "GitHub") {
    await new Promise((resolve) => setTimeout(resolve, 10000));

    const workflowCreated = await verifyGithubActionsWorkflow(repoFullName);
    if (workflowCreated) {
      console.log("GitHub Actions workflow was successfully created.");
    } else {
      console.log("Failed to create GitHub Actions workflow.");
    }
  }
}

async function main() {
  try {
    let versionChoice;
    if (args.includes("--github")) {
      versionChoice = "GitHub";
    } else if (args.includes("--gitlab")) {
      versionChoice = "Gitlab";
    } else if (args.includes("--bitbucket")) {
      versionChoice = "Bitbucket";
    }

    if (versionChoice) {
      await startProcess(versionChoice);
    } else {
      const { versionChoice: chosenVersionChoice } = await inquirer.prompt({
        type: "list",
        name: "versionChoice",
        message: "Which version control tool do you need?",
        choices: ["GitHub", "Bitbucket", "Gitlab"],
        default: "GitHub",
      });
      await startProcess(chosenVersionChoice);
    }
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}

main().catch((error) => console.error(error));
