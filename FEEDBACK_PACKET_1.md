# Feedback Packet 1

The intention of these "packets" will be to highlight one or more workflows or
feature sets in a way that doesn't require a large time commitment to test and offer feedback on.
The aim is to drop new feedback packets at regular intervals while we incorporate feedback and iterate.

Why "packets"?
I got the idea for the name from the TTRPG industry where they often use play test content "packets" to gather feedback.

If you are able to follow the guide outlined below, gather your thoughts and then offer some feedback
that would be most appreciated.

## Installation

```
mkdir test-packet
cd test-packet
npm init -f
npm i @podium/experimental-podium-element @podium/experimental-fastify-podlet-server
```

Edit your `package.json` file and add `"type": "module",` to enable esm support.

## Running the server

```
npx podlet dev
```

And visit `http://localhost:8080` and you should be redirected to the podlet's manifest file.

## Building a simple podlet, step by step

### Step 1. The content route

Create a content.js file in the test-packet folder.
Inside this file, we need to export a Lit custom element which will be automatically server rendered and hydrated client side.

Here is an example of a basic component with some simple markup in it.

```js
// content.js
import { html } from "lit";
import { PodiumElement } from "@podium/experimental-podium-element";

export default class Content extends PodiumElement {
  render() {
    return html`
      <section>
        <div>
          <h2>How much money?</h2>
          <p>Most likely, a lot</p>
          <div>
            <a href="/">Buy and Sell</a>
          </div>
        </div>
      </section>
    `;
  }
}
```

Fire up the server again 

```
npx podlet dev
```

And visit `http://localhost:8080`

### Step 2. The fallback route

Adding a fallback is much the same. Define a component in the file fallback.js

```js
// content.js
import { html } from "lit";
import { PodiumElement } from "@podium/experimental-podium-element";

export default class Fallback extends PodiumElement {
  render() {
    return html`<div>Ooops! Something went wrong</div>`;
  }
}
```

You should now be able to visit `http://localhost:8080` and then add `/fallback` to the end of the url to get the fallback route.

### Step 3. Server side data

In most cases, you'll need some kind of server side data in your component. To do so, define a file called `server.js` and call the `setContentState` function.
Pass it a function that responds with data. This function will be called on each request.

```js
// server.js
export default async function server(app) {
  app.setContentState(async (req) => {
    return [
        { name: "Norway" },
        { name: "Sweden" },
        { name: "Finland" },
        { name: "Denmark" },
        { name: "New Zealand??" },
    ]
  });
}
```

And then back in content.js you can access this data using `this.initialState`.

```js
// content.js
import { html } from "lit";
import { PodiumElement } from "@podium/experimental-podium-element";

export default class Content extends PodiumElement {
  render() {
    return html`
      <section>
        <h1>List of countries</h1>
        <ul>
            ${this.initialState.map(({ name }) => html`<li>${name}</li>`)}
        </ul>
      </section>
    `;
  }
}
```

There is a matching `setFallbackState` function you can call if you need data in your fallback.

## Feedback

Send us you feedback which ever way works best for you. DM, in the podium-labs channel, email. Happy to receive it.
