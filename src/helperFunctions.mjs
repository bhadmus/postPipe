#!/usr/bin/env node

import fetch from "node-fetch";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import inquirer from "inquirer";
import FormData from "form-data";

/**
 * Create a package.json file with specified dependencies and install them.
 * @param {string} dirPath - Directory where the package.json will be created.
 * @param {Object} dependencies - Dependencies to include in package.json.
 */
export function createAndInstallPackageJson(dirPath, dependencies) {
  const packageJsonPath = path.join(dirPath, "package.json");

  // Create package.json content
  const packageJsonContent = {
    name: "postman-collection-runner",
    version: "1.0.0",
    description:
      "A Node.js project for running Postman collections using Newman",
    main: "index.js",
    scripts: {
      test: `npx newman run ${dependencies.collectionFilePath}`,
    },
    dependencies: {
      newman: "6.1.3",
      "newman-reporter-htmlextra": "1.23.1",
    },
  };

  // Write package.json to the specified directory
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJsonContent, null, 2),
    "utf8"
  );
  console.log("package.json created successfully.");

  // Install the dependencies
  execSync("npm install", { cwd: dirPath, stdio: "inherit" });

  console.log("Dependencies installed successfully.");
}

/**
 * Generate a specific YAML file for running Postman tests.
 * @param {string} versionChoice - Version Control tool type.
 * @param {string} collectionFilePath - Path to the Postman collection JSON file.
 * @param {string} environmentFilePath - Path to the Postman environment JSON file.
 * @param {string} outputYamlFilePath - Path where the YAML file should be saved.
 */
export function generateYaml(
  versionChoice,
  collectionFilePath,
  environmentFilePath,
  outputYamlFilePath
) {
  const outputDir = path.dirname(outputYamlFilePath);
  fs.ensureDirSync(outputDir);
  let yamlFileContent;
  switch (versionChoice) {
    case "GitHub":
      if (!environmentFilePath) {
        yamlFileContent = `
    
name: Run Postman Collection

on: [push]

jobs:
    run-postman-collection:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout repository
          uses: actions/checkout@v4

        - name: Set up node
          uses: actions/setup-node@v3
          with:
            node-version: '18'

        - name: Install Dependencies
          run: |
            npm install
            echo "check dependencies version"
            npx newman --version
            npx newman-reporter-htmlextra --version

        - name: Run Postman collection
          run: |
            echo "create report directory"
            mkdir -p ./newman
            npx newman run ${collectionFilePath} -r cli,htmlextra --reporter-htmlextra-export ./newman/results.html

        - name: Upload Test Results
          uses: actions/upload-artifact@v3
          with:
            name: postman-test-results
            path: ./newman/results.html
    `;
      } else {
        yamlFileContent = `
    
name: Run Postman Collection

on: [push]

jobs:
    run-postman-collection:
        runs-on: ubuntu-latest

        steps:
        - name: Checkout repository
          uses: actions/checkout@v4

        - name: Set up node
          uses: actions/setup-node@v3
          with:
            node-version: '18'

        - name: Install Dependencies
          run: |
            npm install
            echo "check dependencies version"
            npx newman --version
            npx newman-reporter-htmlextra --version

        - name: Run Postman collection
          run: |
            echo "create report directory"
            mkdir -p ./newman
            npx newman run ${collectionFilePath} -e ${environmentFilePath} -r cli,htmlextra --reporter-htmlextra-export ./newman/results.html

        - name: Upload Test Results
          uses: actions/upload-artifact@v3
          with:
            name: postman-test-results
            path: ./newman/results.html
    `;
      }

      console.log(
        `Generating GitHub Actions YAML file at ${outputYamlFilePath} successfully`
      );
      fs.writeFileSync(outputYamlFilePath, yamlFileContent, "utf8");
      console.log("YAML file generated successfully.");
      break;

    case "Gitlab":
      if (!environmentFilePath) {
        yamlFileContent = `
stages:
  - test

pipeline:
  image: node:latest
  stage: test
  script: 
    # Install from package.json
    - npm i
    - npx newman run ${collectionFilePath} -r cli,htmlextra --reporter-htmlextra-export ./newman/results.html

  artifacts:
    paths:
      - ./newman/results.html
    `;
      } else {
        yamlFileContent = `
stages:
  - test

pipeline:
  image: node:latest
  stage: test
  script: 
    # Install from package.json
    - npm i
    - npx newman run ${collectionFilePath} -e ${environmentFilePath} -r cli,htmlextra --reporter-htmlextra-export ./newman/results.html

  artifacts:
    paths:
      - ./newman/results.html
    `;
      }

      console.log(
        `Generating Gitlab YAML file at ${outputYamlFilePath} successfully`
      );
      fs.writeFileSync(outputYamlFilePath, yamlFileContent, "utf8");
      console.log("YAML file generated successfully.");

      break;

    case "Bitbucket":
      if (!environmentFilePath) {
        yamlFileContent = `

image: node:latest

pipelines:
  default:
    - step:
        script:
          - npm i
          - mkdir -p ./newman
          - npx newman --version
          - npx newman run ${collectionFilePath} -r cli,htmlextra --reporter-htmlextra-export ./newman/results.html

        artifacts:
          - newman/results.html  


    `;
      } else {
        yamlFileContent = `
    
image: postman/newman

pipelines:
  default:
    - step:
        script:
          - npm i
          - mkdir -p ./newman
          - newman --version
          - npx newman run ${collectionFilePath} -e ${environmentFilePath} -r cli,htmlextra --reporter-htmlextra-export ./newman/results.html

        artifacts:
            - newman/results.html  
    `;
      }

      console.log(
        `Generating Gitlab YAML file at ${outputYamlFilePath} successfully`
      );
      fs.writeFileSync(outputYamlFilePath, yamlFileContent, "utf8");
      console.log("YAML file generated successfully.");
  }
}

/**
 * Commit multiple files to the specified repository in a single commit.
 * @param {string} versionChoice - Version Control tool type.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoFullName - Full repository name (e.g., username/repo).
 * @param {Array<string>} files - List of file paths to commit.
 * @param {string} message - Commit message.
 */


export async function makeCommit(
  versionChoice,
  token, // This could be a token for GitHub, or GitLab or an app password for Bitbucket
  repoFullName,
  files,
  message
) {
  switch (versionChoice) {
    case "GitHub":
      try {
        const headers = {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json", // Correct header for GitHub API
        };

        const branch = "main";
        const fileBlobs = [];

        for (const file of files) {
          const content = fs.readFileSync(file, "base64");
          const repoFilePath = path
            .relative(process.cwd(), file)
            .replace(/\\/g, "/"); // Ensure the file path is relative and uses forward slashes

          fileBlobs.push({
            path: repoFilePath,
            content,
          });
        }

        // Fetch the latest commit SHA for the branch
        const refResponse = await fetch(
          `https://api.github.com/repos/${repoFullName}/git/ref/heads/${branch}`,
          { headers }
        );
        const refData = await refResponse.json();
        if (!refResponse.ok) {
          throw new Error(`Failed to fetch reference: ${refData.message}`);
        }
        const latestCommitSha = refData.object.sha;

        // Fetch the tree SHA of the latest commit
        const commitResponse = await fetch(
          `https://api.github.com/repos/${repoFullName}/git/commits/${latestCommitSha}`,
          { headers }
        );
        const commitData = await commitResponse.json();
        if (!commitResponse.ok) {
          throw new Error(`Failed to fetch commit: ${commitData.message}`);
        }
        const treeSha = commitData.tree.sha;

        // Create a new tree with the updated files
        const treeResponse = await fetch(
          `https://api.github.com/repos/${repoFullName}/git/trees`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              base_tree: treeSha,
              tree: fileBlobs.map((file) => ({
                path: file.path,
                mode: "100644",
                type: "blob",
                content: Buffer.from(file.content, "base64").toString("utf8"),
              })),
            }),
          }
        );
        const treeData = await treeResponse.json();
        if (!treeResponse.ok) {
          throw new Error(`Failed to create tree: ${treeData.message}`);
        }

        // Create a new commit
        const newCommitResponse = await fetch(
          `https://api.github.com/repos/${repoFullName}/git/commits`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              message,
              tree: treeData.sha,
              parents: [latestCommitSha],
            }),
          }
        );
        const newCommitData = await newCommitResponse.json();
        if (!newCommitResponse.ok) {
          throw new Error(`Failed to create commit: ${newCommitData.message}`);
        }

        // Update the branch to point to the new commit
        const updateResponse = await fetch(
          `https://api.github.com/repos/${repoFullName}/git/refs/heads/${branch}`,
          {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              sha: newCommitData.sha,
            }),
          }
        );
        const updateData = await updateResponse.json();
        if (!updateResponse.ok) {
          throw new Error(`Failed to update branch: ${updateData.message}`);
        }

        console.log(`Commit successfully created: ${newCommitData.sha}`);
      } catch (error) {
        console.error(
          "An error occurred while committing files to GitHub:",
          error.message
        );
        throw error;
      }
      break;

    case "Gitlab":
      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.gitlab.v4+json",
        };

        // Step 1: Get the authenticated user's ID
        const userResponse = await fetch("https://gitlab.com/api/v4/user", {
          headers,
        });
        const userData = await userResponse.json();

        if (!userResponse.ok) {
          throw new Error(`Failed to fetch user ID: ${userData.message}`);
        }

        const userId = userData.id;

        // Step 2: Get the project ID based on the repoFullName
        const projectsResponse = await fetch(
          `https://gitlab.com/api/v4/users/${userId}/projects`,
          { headers }
        );
        const projectsData = await projectsResponse.json();

        if (!projectsResponse.ok) {
          throw new Error(
            `Failed to fetch projects for user ID ${userId}: ${projectsData.message}`
          );
        }

        // Find the project that matches the repoFullName
        const project = projectsData.find(
          (proj) => proj.path_with_namespace === repoFullName
        );

        if (!project) {
          throw new Error(
            `Project ${repoFullName} not found for user ID ${userId}`
          );
        }

        const projectId = project.id;
        const branch = "main";

        // Step 3: Prepare the actions for the commit with existence check
        const actions = await Promise.all(
          files.map(async (file) => {
            const repoFilePath = path
              .relative(process.cwd(), file)
              .replace(/\\/g, "/");

            // Check if the file exists in the repository
            const fileExistsResponse = await fetch(
              `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodeURIComponent(
                repoFilePath
              )}/raw?ref=${branch}`,
              { headers }
            );

            const content = fs.readFileSync(file, "utf8");

            // Determine the correct action based on the file's existence
            const actionType = fileExistsResponse.ok ? "update" : "create";

            return {
              action: actionType,
              file_path: repoFilePath,
              content: content,
            };
          })
        );

        // Step 4: Create the commit with the updated files
        const commitResponse = await fetch(
          `https://gitlab.com/api/v4/projects/${projectId}/repository/commits`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              branch,
              commit_message: message,
              actions,
            }),
          }
        );

        const commitData = await commitResponse.json();

        if (!commitResponse.ok) {
          throw new Error(`Failed to create commit: ${commitData.message}`);
        }

        console.log(`Commit successfully created: ${commitData.id}`);
      } catch (error) {
        console.error(
          "An error occurred while committing files to GitLab:",
          error.message
        );
        throw error;
      }
      break;

    case "Bitbucket":
      try {
        const authHeader = `Basic ${Buffer.from(
          `${username}:${token}`
        ).toString("base64")}`;
        const baseUrl = `https://api.bitbucket.org/2.0/repositories/${repoFullName}`;
        const branch = "main";

        // Step 1: Check if the pipeline configuration file exists
        const pipelineFileUrl = `${baseUrl}/src/${branch}/bitbucket-pipelines.yml`;
        let pipelineFileResponse = await fetch(pipelineFileUrl, {
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
          },
        });

        if (pipelineFileResponse.status === 404) {
          console.warn(`No Commits Yet. Enabling Bitbucket pipelines.`);

          // Enable pipelines if the configuration file does not exist
          const pipelineEnableUrl = `${baseUrl}/pipelines_config`;
          const enablePipelineResponse = await fetch(pipelineEnableUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            body: JSON.stringify({ enabled: true }),
          });

          if (!enablePipelineResponse.ok) {
            const errorText = await enablePipelineResponse.text();
            throw new Error(`Failed to enable pipelines: ${errorText}`);
          }
        } else if (!pipelineFileResponse.ok) {
          const errorText = await pipelineFileResponse.text();
          throw new Error(
            `Failed to check pipeline configuration file: ${errorText}`
          );
        }

        // Step 2: Fetch the latest commit SHA for the branch
        const branchResponse = await fetch(
          `${baseUrl}/refs/branches/${branch}`,
          {
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
            },
          }
        );

        if (!branchResponse.ok) {
          const errorText = await branchResponse.text();
          throw new Error(`Failed to fetch branch: ${errorText}`);
        }

        const branchData = await branchResponse.json();
        const latestCommitSha = branchData.target.hash;

        // Step 3: Prepare form-data for the commit
        const form = new FormData();
        form.append("message", message); // Commit message
        form.append("branch", branch); // Branch to commit to
        form.append("parents", latestCommitSha); // Parent commit SHA

        // Add each file to the form-data
        for (const file of files) {
          const content = fs.readFileSync(file); // Read file content as buffer
          const repoFilePath = path
            .relative(process.cwd(), file)
            .replace(/\\/g, "/"); // Convert to relative path with forward slashes
          form.append(repoFilePath, content, {
            filename: repoFilePath,
            contentType: "application/octet-stream", // MIME type for binary data
          });
        }

        // Step 4: Send the commit request
        const commitResponse = await fetch(`${baseUrl}/src`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            ...form.getHeaders(), // Headers required for multipart/form-data
          },
          body: form, // Multipart form-data body
        });

        // Step 5: Check for response and log accordingly
        if (!commitResponse.ok) {
          const errorText = await commitResponse.text();
          throw new Error(`Failed to create commit: ${errorText}`);
        } else {
        
          console.log(`Commit successfully created`);
        }
      } catch (error) {
        console.error(
          "An error occurred while committing files to Bitbucket:",
          error.message
        );
        throw error;
      }
      break;

    default:
      throw new Error("Unsupported version control platform");
  }
}

/**
 * Export a Postman collection to a file.
 * @param {string} apiKey - Postman API key.
 * @param {string} collectionId - Postman collection ID.
 * @param {string} outputFilePath - Path where the JSON file should be saved.
 */
export async function exportPostmanCollection(
  apiKey,
  collectionId,
  outputFilePath
) {
  try {
    console.log(
      `Exporting Postman collection ${collectionId} to ${outputFilePath}`
    );
    const response = await fetch(
      `https://api.getpostman.com/collections/${collectionId}`,
      {
        headers: {
          "X-Api-Key": apiKey,
        },
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to export Postman collection: ${data.error}`);
    }
    fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), "utf8");
    console.log("Postman collection exported successfully.");
  } catch (error) {
    console.error(
      "An error occurred while exporting the Postman collection:",
      error.message
    );
    throw error;
  }
}
/**
 * Export a Postman collection to a file.
 * @param {string} apiKey - Postman API key.
 * @param {string} environmentId - Postman environment ID.
 * @param {string} outputFilePath - Path where the JSON file should be saved.
 */
export async function exportPostmanEnvironment(
  apiKey,
  environmentId,
  outputFilePath
) {
  try {
    console.log(
      `Exporting Postman collection ${environmentId} to ${outputFilePath}`
    );
    const response = await fetch(
      `https://api.getpostman.com/environments/${environmentId}`,
      {
        headers: {
          "X-Api-Key": apiKey,
        },
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to export Postman environment: ${data.error}`);
    }
    fs.writeFileSync(outputFilePath, JSON.stringify(data, null, 2), "utf8");
    console.log("Postman environment exported successfully.");
  } catch (error) {
    console.error(
      "An error occurred while exporting the Postman environment:",
      error.message
    );
    throw error;
  }
}

/**
 * Create a new GitHub repository.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoName - Name of the repository to create.
 * @returns {string} - Full name of the created repository (e.g., username/repo).
 */
// export async function createGithubRepo(token, repoName) {
//   try {
//     console.log(`Creating GitHub repository ${repoName}`);
//     const response = await fetch("https://api.github.com/user/repos", {
//       method: "POST",
//       headers: {
//         Authorization: `token ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         name: repoName,
//         private: false,
//       }),
//     });
//     const data = await response.json();
//     if (!response.ok) {
//       throw new Error(`Failed to create GitHub repository: ${data.message}`);
//     }
//     console.log("GitHub repository created successfully:", data.full_name);
//     return data.full_name;
//   } catch (error) {
//     console.error(
//       "An error occurred while creating the GitHub repository:",
//       error.message
//     );
//     throw error;
//   }
// }

/**
 * Create a new repository.
 * @param {string} versionChoice - Version Control tool type.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoName - Name of the repository to create.
 * @returns {string} - Full name of the created repository (e.g., username/repo).
 */
let username;
let selectedWorkspace;

export async function createRepo(versionChoice, token, repoName) {
  switch (versionChoice) {
    case "GitHub":
      try {
        console.log(`Creating GitHub repository ${repoName}`);
        const response = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: repoName,
            private: false,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            `Failed to create GitHub repository: ${data.message}`
          );
        }
        console.log("GitHub repository created successfully:", data.full_name);
        return data.full_name;
      } catch (error) {
        console.error(
          "An error occurred while creating the GitHub repository:",
          error.message
        );
        throw error;
      }
      break;

    case "Gitlab":
      try {
        console.log(`Creating GitLab repository ${repoName}`);
        const response = await fetch("https://gitlab.com/api/v4/projects", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: repoName,
            visibility: "public", // Set to 'private' for a private repository
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            `Failed to create GitLab repository: ${data.message}`
          );
        }
        console.log(
          "GitLab repository created successfully:",
          data.path_with_namespace
        );
        return data.path_with_namespace;
      } catch (error) {
        console.error(
          "An error occurred while creating the GitLab repository:",
          error.message
        );
        throw error;
      }
      break;

    case "Bitbucket":
      try {
        // Get username from user
        const { bitBucketName } = await inquirer.prompt({
          type: "input",
          name: "bitBucketName",
          message: "What is your BitBucket username?",
        });
        username = bitBucketName;

        // Fetch available workspaces
        const workspacesResponse = await fetch(
          `https://api.bitbucket.org/2.0/workspaces`,
          {
            method: "GET",
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${username}:${token}`
              ).toString("base64")}`,
              Accept: "application/json",
            },
          }
        );

        const workspacesData = await workspacesResponse.json();
        if (!workspacesResponse.ok) {
          throw new Error(
            `Failed to fetch workspaces: ${workspacesData.error.message}`
          );
        }

        const workspaces = workspacesData.values.map(
          (workspace) => workspace.slug
        );

        if (workspaces.length === 0) {
          throw new Error("No workspaces found for this account.");
        }

        // Select the first workspace or prompt the user to select one
        selectedWorkspace = workspaces[0]; // Or you can prompt to choose from workspaces if there are multiple

        console.log(`Selected workspace: ${selectedWorkspace}`);

        // Create the Bitbucket repository
        console.log(
          `Creating Bitbucket repository ${repoName} in workspace ${selectedWorkspace}`
        );

        const repoResponse = await fetch(
          `https://api.bitbucket.org/2.0/repositories/${selectedWorkspace}/${repoName}`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(
                `${username}:${token}`
              ).toString("base64")}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              scm: "git",
              is_private: false,
            }),
          }
        );

        const repoData = await repoResponse.json();
        if (!repoResponse.ok) {
          throw new Error(
            `Failed to create Bitbucket repository: ${
              repoData.error?.message || "Unknown error"
            }`
          );
        }

        console.log(
          "Bitbucket repository created successfully:",
          repoData.full_name
        );
        return repoData.full_name;
      } catch (error) {
        console.error(
          "An error occurred while creating the Bitbucket repository:",
          error.message
        );
        throw error;
      }
  }
}

/**
 * Verify if a GitHub Actions workflow is created.
 * @param {string} repoFullName - Full repository name (e.g., username/repo).
 * @returns {boolean} - True if workflow exists, false otherwise.
 */

export async function verifyGithubActionsWorkflow(
  repoFullName,
  branch = "main",
  retries = 3
) {
  try {
    console.log(
      `Verifying GitHub Actions workflow for repository ${repoFullName}`
    );
    const apiUrl = `https://api.github.com/repos/${repoFullName}/actions/workflows`;
    for (let attempt = 1; attempt <= retries; attempt++) {
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          `Failed to verify GitHub Actions workflow: ${data.message}`
        );
      }
      console.log(
        `Attempt ${attempt}: GitHub Actions workflow verification - ${
          data.total_count > 0 ? "exists" : "does not exist"
        }`
      );
      if (data.total_count > 0) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds between retries
    }
    return false;
  } catch (error) {
    console.error(
      "An error occurred while verifying the GitHub Actions workflow:",
      error.message
    );
    throw error;
  }
}

/**
 * Initialize a repository with a README file.
 * @param {string} versionChoice - Version Control tool type.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoFullName - Full repository name (e.g., username/repo).
 * @returns {boolean} - True if initialization is successful, false otherwise.
 */
// COMPLETE FOR GITLAB AND BITBUCKET LATER
export async function initializeRepoWithReadme(
  versionChoice,
  token,
  repoFullName
) {
  switch (versionChoice) {
    case "GitHub":
      try {
        console.log(
          `Initializing repository ${repoFullName} with a README file`
        );
        const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/README.md`;
        const body = JSON.stringify({
          message: "Initial commit",
          content: Buffer.from("# " + repoFullName.split("/").pop()).toString(
            "base64"
          ),
        });
        const response = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
          body,
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Failed to initialize repository: ${data.message}`);
        }
        console.log("Repository initialized with README successfully.");
        return true;
      } catch (error) {
        console.error(
          "An error occurred while initializing the repository with README:",
          error.message
        );
        throw error;
      }
      break;
    case "Gitlab":
      try {
        console.log(
          `Initializing GitLab repository ${repoFullName} with a README file`
        );

        const [namespace, project] = repoFullName.split("/");
        const apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(
          namespace
        )}%2F${encodeURIComponent(project)}/repository/files/README.md`;

        const body = JSON.stringify({
          branch: "main",
          content: "# " + repoFullName.split("/").pop(),
          commit_message: "Initial commit",
        });

        const response = await fetch(apiUrl, {
          method: "POST", // In GitLab, `POST` is used to create a new file
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(`Failed to initialize repository: ${data.message}`);
        }
        console.log("GitLab repository initialized with README successfully.");
        return true;
      } catch (error) {
        console.error(
          "An error occurred while initializing the GitLab repository with README:",
          error.message
        );
        throw error;
      }
      break;
    case "Bitbucket":
      try {
        console.log(
          `Initializing Bitbucket repository ${repoFullName} with a README file`
        );

        // const [workspace, repoSlug] = repoFullName.split("/");
        const apiUrl = `https://api.bitbucket.org/2.0/repositories/${repoFullName}/src`;

        const body = new URLSearchParams({
          message: "Initial commit",
          branch: "main",
          [`README.md`]: "# " + repoFullName.split("/").pop(),
        });

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(
              `${username}:${token}`
            ).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(
            `Failed to initialize repository: ${data.error.message}`
          );
        }
        console.log(
          "Bitbucket repository initialized with README successfully."
        );
        return true;
      } catch (error) {
        console.error(
          "An error occurred while initializing the Bitbucket repository with README:",
          error.message
        );
        throw error;
      }
  }
}

/**
 * Check if README.md exists in the repository.
 * @param {string} token - GitHub personal access token.
 * @param {string} repoFullName - Full repository name (e.g., username/repo).
 * @returns {boolean} - True if README.md exists, false otherwise.
 */
// COMPLETE FOR GITLAB AND BITBUCKET LATER
export async function readmeExists(token, repoFullName) {
  try {
    console.log(`Checking if README.md exists in repository ${repoFullName}`);
    const apiUrl = `https://api.github.com/repos/${repoFullName}/contents/README.md`;
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    console.log(
      `README.md ${response.status === 200 ? "exists" : "does not exist"}`
    );
    return response.status === 200;
  } catch (error) {
    console.error(
      "An error occurred while checking if README.md exists:",
      error.message
    );
    throw error;
  }
}
