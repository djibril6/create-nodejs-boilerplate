const util = require('util');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
import arg from 'arg';
import inquirer from 'inquirer';
const ora = require('ora');
const figlet = require('figlet');
const chalk = require('chalk');

const templateValues = ["RestAPI", "graphQL"];
const repo = {
  "RestAPI": 'https://github.com/djibril6/restapi-nodejs-boilerplate.git',
  "graphQL": 'Not yet'
};

function welcome() {
  console.log(chalk.blue(figlet.textSync('NodeJS app')))
  console.log(chalk.blue(figlet.textSync('Generator')))
  console.log(chalk.blue("\n---------------------------------------------------------"))
  console.log(chalk.blue("    Author: Djibril ISSOUFOU - github.com/djibril6"))
  console.log(chalk.blue("---------------------------------------------------------\n"))
  console.log(chalk.white(`This is a CLI to generate a boilerplate
  for quick starting a NodeJS app using Express, Typescript
  and other many commonly used tools to create NodeJS REST or GraphQL APIs. \n`));
}

// Utility functions
const exec = util.promisify(require('child_process').exec);
async function runCmd(command) {
  try {
    const { stdout, stderr } = await exec(command);
    console.log(stdout);
    console.log(stderr);
  } catch {
    (error) => {
      console.log(error);
    };
  }
}

async function hasYarn() {
  try {
    await execSync('yarnpkg --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getArguments(rawArgs) {
    const args = arg(
      {
        '--template': String,
        '-t': '--template',
      },
      {
        argv: rawArgs.slice(2),
      }
    );
    return {
      appName: args._[0],
      template: args['--template'] || templateValues[0],
    };
}


async function validateArguments(options) {
    const questions = [];
    if (!options.appName) {
      questions.push({
        type: 'input',
        name: 'appName',
        message: 'Please specify a name for your project',
        validate: value => {
          const letterNumber = /^[0-9a-zA-Z]+$/
    
          if (!value) {
            return 'The project name must be provided'
          } else if (value.includes(' ')) {
            return 'Your project\'s name cannot have spaces or special chars'
          }
    
          return true;
        }
      });
    }

    if (options.template && !templateValues.includes(options.template)) {
        questions.push({
          type: 'list',
          name: 'template',
          message: 'Please choose a correct template value',
          choices: templateValues,
          default: templateValues[0],
        });
      }
   
    const answers = await inquirer.prompt(questions);
    return {
      ...options,
      appName: answers.appName || options.appName,
      template: answers.template || options.template
    };
}

function isDirectoryExist(appPath) {
    try {
        fs.mkdirSync(appPath);
      } catch (err) {
        if (err.code === 'EEXIST') {
          console.log('Directory already exists. Please choose another name for the project.');
        } else {
          console.log(err);
        }
        process.exit(1);
      }
}

async function setup(appPath, folderName, options) {
  try {
    // Clone the repo
    if (options.template === templateValues[1]) {
      throw Error(`${options.template} template is not available yet`)
    }

    let spinner = ora(`Downloading project files from ${repo[options.template]}`).start();
    // console.log(`Downloading project files from ${repo[options.template]}`);
    await runCmd(`git clone --depth 1 ${repo[options.template]} ${folderName}`);
    // console.log('');
    spinner.stop();

    // Change directory
    process.chdir(appPath);

    // Install dependencies
    const useYarn = await hasYarn();
    // console.log('Installing dependencies...');
    spinner = ora('Installing dependencies...').start();
    if (useYarn) {
      await runCmd('yarn install');
    } else {
      await runCmd('npm install');
    }
    spinner.stop();
    console.log('Dependencies installed.');
    console.log();

    // Copy envornment variables
    fs.copyFileSync(path.join(appPath, '.env.example'), path.join(appPath, '.env'));
    fs.unlinkSync(path.join(appPath, '.env.example'));
    console.log('Environment files copied.');

    // Delete .git folder
    await runCmd('npx rimraf ./.git');

    // Remove extra files
    if (!useYarn) {
      fs.unlinkSync(path.join(appPath, 'yarn.lock'));
    }

    // Remove unused packages
    console.log('Removing unused packages...');
    if (useYarn) {
        await runCmd('yarn remove inquirer');
        await runCmd('yarn remove arg');
        await runCmd('yarn remove esm');
    } else {
        await runCmd('npm uninstall inquirer');
        await runCmd('npm uninstall arg');
        await runCmd('npm uninstall esm');
    }
    console.log('Packages removed.');

    console.log('Installation completed!');
    console.log();

    console.log('Start by typing:');
    console.log(`    cd ${folderName}`);
    console.log(useYarn ? '    yarn dev' : '    npm run dev');
    console.log();
    console.log('Happy coding!!!');
  } catch (error) {
    console.log(error);
  }
}

export async function cli(args) {
  welcome();
    let options = getArguments(args);
    options = await validateArguments(options);

    // Define constants
    const ownPath = process.cwd();
    const folderName = options.appName;
    const appPath = path.join(ownPath, folderName);

    isDirectoryExist(appPath);

    setup(appPath, folderName, options);
}