# Simple Beginner's Guide to Creating a Podium Podlet Server

This beginner's guide will walk you through creating a basic Podium podlet server, setting up the server, and writing your first `content.js` file. We'll also test the output in a browser.

## Step 1: Start a new project

First, create a new directory for your project and navigate to it:
```
mkdir my-podlet
cd my-podlet
```
Next, initialize a new npm project:
```
npm init -y
```
## Step 2: Install the required packages

Install the Podium podlet server package:
```sh
npm install --save @podium/podlet-server lit
```

## Step 3: Create the content.js file

Create a new file called `content.js` in your project directory:
```
touch content.js
```
Open `content.js` in your text editor and add the following code:
```js
import { html } from 'lit';
import { PodiumElement } from '@podium/element';

export default class Content extends PodiumElement {
  render() {
    return html`<section>Welcome to your first Podium podlet!</section>`;
  }
}
```

## Step 4: Add start and dev scripts

Open `package.json` in your text editor and add the following scripts:
```json
{
  "scripts": {
    "build": "podlet build",
    "start": "podlet start",
    "dev": "podlet dev"
  }
}
```
## Step 5: Run the development server

Start the development server by running:
```
npm run dev
```
The development server should start, and your podlet should be accessible at `http://localhost:8080`.

## Step 6: Test in the browser

Open your browser and navigate to `http://localhost:8080`. You should see the following message displayed:

Welcome to your first Podium podlet!

Congratulations! You have successfully created a basic Podium podlet server, set up the server, written your first `content.js` file, and tested it in the browser. From here, you can explore the various features and configurations available in the Podium podlet server package to build more complex and feature-rich podlets.
