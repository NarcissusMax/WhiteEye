// Uses an isolated Chromium instance's DevTools protocol. No browser dependencies.
const artifactDir = Deno.args[0] || "artifacts";
if (!/^artifacts(?:\/[a-z0-9-]+)?$/.test(artifactDir)) {
  throw Error("Screenshot output must be artifacts or one named subdirectory.");
}
const targets = await (await fetch("http://127.0.0.1:9222/json")).json();
const page = targets.find((t) => t.type === "page");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.onopen = resolve);
let seq = 0;
const pending = new Map();
const errors = [];
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id) {
    const p = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) p.reject(Error(JSON.stringify(data.error)));
    else p.resolve(data.result);
  }
  if (data.method === "Runtime.exceptionThrown") errors.push(data.params.exceptionDetails.text);
};
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(expression, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
}
let assertionCount = 0;
const assert = (v, label) => {
  if (!v) throw Error(label);
  assertionCount++;
  console.log("PASS", label);
};
await call("Runtime.enable");
await call("Page.enable");
await call("Emulation.setEmulatedMedia", {
  features: [
    { name: "prefers-reduced-motion", value: "no-preference" },
    { name: "pointer", value: "fine" },
  ],
});
// Never spend the owner's API credits during UI checks, even with a live model.
await call("Page.addScriptToEvaluateOnNewDocument", {
  source: `
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (url, options) => {
    if (url === '/api/status') return Promise.resolve(Response.json({configured:false}));
    if (url === '/api/chat') return Promise.resolve(Response.json({error:'The conversation model is not connected yet.'},{status:503}));
    return originalFetch(url, options);
  };
`,
});
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await call("Page.navigate", { url: "about:blank" });
await wait(100);
await call("Storage.clearDataForOrigin", {
  origin: "http://127.0.0.1:8000",
  storageTypes: "local_storage",
});
await call("Page.navigate", { url: "http://127.0.0.1:8000/" });
await wait(700);
await Deno.mkdir(artifactDir, { recursive: true });
async function screenshot(name) {
  const { data } = await call("Page.captureScreenshot", { format: "png" });
  await Deno.writeFile(
    `${artifactDir}/${name}.png`,
    Uint8Array.from(atob(data), (c) => c.charCodeAt(0)),
  );
}
await evaluate("sessionStorage.removeItem('whiteeye:entrance:v2');location.reload()");
await wait(700);
assert(await evaluate('document.querySelector("#entrance").open'), "opening animation appears");
assert(
  await evaluate('document.activeElement.id==="skip-entrance"'),
  "opening focuses skip control",
);
await screenshot("entrance");
await evaluate('document.querySelector("#skip-entrance").click()');
assert(await evaluate('!document.querySelector("#entrance").open'), "opening skips immediately");
await evaluate('document.querySelector("#replay-entrance").click()');
await wait(3100);
assert(
  await evaluate('!document.querySelector("#entrance").open'),
  "opening completes automatically",
);
assert(await evaluate('document.activeElement.id==="replay-entrance"'), "replay restores focus");
assert(await evaluate('document.fonts.check("32px WhiteEyeGothic")'), "bundled gothic font loads");
await screenshot("desktop");
assert(
  await evaluate(
    '!!document.querySelector("#welcome") && !document.querySelector("#welcome").hidden',
  ),
  "landing renders",
);
assert(
  await evaluate("document.documentElement.scrollWidth <= innerWidth"),
  "desktop has no horizontal overflow",
);
await evaluate(
  'import("/js/atmosphere.js").then(({setupAtmosphere})=>setupAtmosphere({force:true}))',
);
assert(
  await evaluate('!!document.querySelector(".cursor-light")'),
  "fine-pointer atmosphere installs a cursor light",
);
await evaluate(`(() => {
  const target = document.querySelector('[data-prompt]');
  target.dispatchEvent(new PointerEvent('pointermove', {
    bubbles: true,
    clientX: 520,
    clientY: 360,
    pointerType: 'mouse'
  }));
})()`);
await wait(80);
assert(
  await evaluate(
    'document.documentElement.classList.contains("cursor-present") && document.documentElement.classList.contains("cursor-over-action")',
  ),
  "cursor light recognizes interactive surfaces",
);
assert(
  await evaluate('!!document.querySelector(".cursor-echo.is-visible")'),
  "cursor movement leaves a brief afterglow",
);
await screenshot("cursor-light");
await evaluate('document.querySelector("[data-prompt]").click()');
await wait(400);
assert(
  await evaluate(
    '!document.querySelector("#error").hidden && document.querySelector("#error").textContent.includes("not connected")',
  ),
  "unconfigured provider shows honest retryable error",
);
await screenshot("connection-error");
await evaluate("location.reload()");
await waitUntil('!!document.querySelector("#entrance")');
assert(
  await evaluate('!document.querySelector("#entrance").open'),
  "opening does not repeat on thread refresh",
);
await waitUntil('document.querySelectorAll(".message.user").length===1');
assert(
  await evaluate('document.querySelectorAll(".message.user").length===1'),
  "conversation survives refresh",
);
assert(
  await evaluate('document.querySelector("#sidebar-memory").checked'),
  "sidebar memory switch defaults on",
);
await evaluate('document.querySelector("#sidebar-memory").click()');
assert(
  await evaluate('!document.querySelector("#sidebar-memory").checked'),
  "sidebar switch can disable prior-chat memory",
);
await evaluate('document.querySelector("#connection").click()');
await wait(200);
assert(await evaluate('document.querySelector("#info-dialog").open'), "connection dialog works");
await evaluate(
  'document.querySelector("#info-dialog").close();document.querySelector("#privacy").click()',
);
assert(
  await evaluate('!document.querySelector("#crosschat-memory").checked'),
  "sidebar memory setting is reflected in privacy dialog",
);
await evaluate(
  'document.querySelector("#crosschat-memory").click();document.querySelector("#info-dialog").close();document.querySelector("#privacy").click()',
);
assert(
  await evaluate(
    'document.querySelector("#crosschat-memory").checked && document.querySelector("#sidebar-memory").checked',
  ),
  "memory preference survives dialog reopening",
);
await evaluate(
  'document.querySelector("#info-dialog").close();document.querySelector("#new-chat").click()',
);
// A synthetic transport is explicitly limited to UI verification, never app behavior.
await evaluate(
  `globalThis.realFetch=fetch;globalThis.fetch=(url,options)=>url==='/api/chat'?Promise.resolve(new Response(new ReadableStream({start(c){const enc=new TextEncoder();setTimeout(()=>c.enqueue(enc.encode(JSON.stringify({type:'delta',text:'Blue. Because of the sea.'})+'\\n')),150);setTimeout(()=>{c.enqueue(enc.encode(JSON.stringify({type:'done',omitted:0})+'\\n'));c.close();},300);}}))):realFetch(url,options);document.querySelector('#message-input').value='Favorite color?';document.querySelector('#composer').requestSubmit();`,
);
await wait(100);
assert(await evaluate('!document.querySelector("#stop").hidden'), "loading exposes cancellation");
await wait(400);
assert(
  await evaluate(
    'document.querySelector(".message.assistant .message-body").textContent==="Blue. Because of the sea."',
  ),
  "streamed reply renders",
);
assert(
  await evaluate(
    'document.querySelector(".history-entry.active .history-memory").getAttribute("aria-pressed")==="true"',
  ),
  "saved chat is eligible for memory by default",
);
await evaluate('document.querySelector(".history-entry.active .history-memory").click()');
assert(
  await evaluate(
    'document.querySelector(".history-entry.active .history-memory").getAttribute("aria-pressed")==="false" && JSON.parse(localStorage.getItem("whiteeye.conversations.v1")).chats.find(c=>c.title==="Favorite color?").remember===false',
  ),
  "per-chat memory exclusion is saved",
);
await evaluate('document.querySelector(".history-entry.active .history-memory").click()');
await screenshot("conversation");
await evaluate('document.querySelector("#new-chat").click()');
assert(
  await evaluate('document.querySelectorAll(".message").length===0'),
  "new conversation is empty",
);
await evaluate('document.querySelector(".history-item").click()');
assert(
  await evaluate('document.querySelectorAll(".message").length===2'),
  "history restores thread",
);
await evaluate('document.querySelector("#delete").click()');
assert(
  await evaluate('document.querySelector("#info-dialog").open'),
  "delete requests confirmation",
);
await evaluate('document.querySelector("#cancel-delete").click()');
assert(
  await evaluate('document.querySelectorAll(".message").length===2'),
  "cancel deletion keeps conversation",
);
await evaluate('document.querySelector("[data-view=reading]").click()');
await wait(900);
await screenshot("perspective");
assert(await evaluate('!document.querySelector("#reading-view").hidden'), "reading room works");
await evaluate(
  'document.querySelector("#back-to-chat").click();document.querySelector("#new-chat").click()',
);
for (const [width, height] of [[390, 844], [320, 700], [768, 1024]]) {
  await call("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await wait(650);
  assert(
    await evaluate("document.documentElement.scrollWidth <= innerWidth"),
    `no horizontal overflow ${width}px`,
  );
  assert(
    await evaluate(
      'document.querySelector("#composer").getBoundingClientRect().bottom <= innerHeight',
    ),
    `composer visible ${width}px`,
  );
  if (width === 390) {
    await wait(700);
    await screenshot("mobile");
    await evaluate('document.querySelector("#mobile-history").click()');
    assert(
      await evaluate('document.querySelector("#sidebar").classList.contains("open")'),
      "mobile history opens",
    );
    await wait(400);
    assert(
      await evaluate(
        '(()=>{const b=document.querySelector("#close-sidebar"),r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return r.top>=0&&(hit===b||b.contains(hit))})()',
      ),
      "mobile history close control is visible and reachable",
    );
    await screenshot("mobile-history");
    await evaluate('document.querySelector("#close-sidebar").click()');
    assert(
      await evaluate('document.querySelector("#sidebar").inert'),
      "closed mobile history is not focusable",
    );
  }
}
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await evaluate(
  `document.querySelector('#message-input').value='x'.repeat(11000);document.querySelector('#message-input').dispatchEvent(new Event('input'));`,
);
assert(await evaluate('!document.querySelector("#char-count").hidden'), "long input shows length");
assert(
  await evaluate('document.querySelector("#message-input").maxLength===-1'),
  "composer has no character cap",
);
await evaluate(
  'document.querySelector("#message-input").value="";document.querySelector("#message-input").focus()',
);
await call("Input.insertText", { text: "x".repeat(13050) });
assert(
  await evaluate('document.querySelector("#message-input").value.length===13050'),
  "pasting beyond the old cap works",
);
await evaluate(
  `document.querySelector('#message-input').value='<img src=x onerror=alert(1)>';document.querySelector('#composer').requestSubmit();`,
);
await wait(400);
assert(
  await evaluate(
    'document.querySelector(".message.user .message-body").querySelector("img")===null',
  ),
  "user content cannot inject HTML",
);
await evaluate(
  'import("/js/atmosphere.js").then(({setupAtmosphere})=>setupAtmosphere({force:true}))',
);
await call("Emulation.setEmulatedMedia", {
  features: [{ name: "prefers-reduced-motion", value: "reduce" }],
});
assert(
  await evaluate('getComputedStyle(document.querySelector(".dust")).animationName==="none"'),
  "reduced motion respected",
);
assert(
  await evaluate('getComputedStyle(document.querySelector(".cursor-light")).display==="none"'),
  "reduced motion disables cursor afterglow",
);
await evaluate('document.querySelector("#replay-entrance").click()');
assert(
  await evaluate(
    'getComputedStyle(document.querySelector(".entrance-eye")).animationName==="none"',
  ),
  "reduced motion entrance is static",
);
await call("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "Escape",
  code: "Escape",
  windowsVirtualKeyCode: 27,
});
await call("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "Escape",
  code: "Escape",
  windowsVirtualKeyCode: 27,
});
assert(await evaluate('!document.querySelector("#entrance").open'), "Escape dismisses entrance");
assert(errors.length === 0, "no uncaught browser exceptions");
// Cancellation and retry, with a transport that respects the abort signal.
await evaluate(
  `document.querySelector('#new-chat').click();globalThis.fetch=(url,options)=>url==='/api/chat'?new Promise((resolve,reject)=>{const timer=setTimeout(()=>resolve(new Response('')),5000);options.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'));},{once:true});}):realFetch(url,options);document.querySelector('#message-input').value='A reply to stop';document.querySelector('#composer').requestSubmit();`,
);
await wait(100);
await evaluate('document.querySelector("#stop").click()');
await wait(100);
assert(
  await evaluate(
    'document.querySelector("#error").textContent.includes("stopped") && document.querySelector("#stop").hidden',
  ),
  "stop cancels pending request",
);
await evaluate(
  `globalThis.fetch=(url,options)=>url==='/api/chat'?Promise.resolve(new Response(JSON.stringify({type:'delta',text:'Retry completed.'})+'\\n'+JSON.stringify({type:'done'})+'\\n')):realFetch(url,options);document.querySelector('#retry').click();`,
);
await wait(150);
assert(
  await evaluate(
    'document.querySelectorAll(".message.user").length===1 && document.querySelector(".message.assistant .message-body").textContent==="Retry completed."',
  ),
  "retry does not duplicate user message",
);
await evaluate(
  'document.querySelector(".history-entry.active .history-delete").click();document.querySelector("#confirm-delete").click()',
);
assert(
  await evaluate('document.querySelectorAll(".message").length===0'),
  "sidebar deletion clears thread",
);
// Browser history fixture verifies rendering and navigation independently of a paid model.
await call("Page.navigate", { url: "about:blank" });
await wait(100);
await call("Page.navigate", { url: "http://127.0.0.1:8000/" });
await wait(250);
await evaluate(
  `globalThis.addEventListener('beforeunload',()=>{const id='long-test';localStorage.setItem('whiteeye.conversations.v1',JSON.stringify({active:id,chats:[{id,title:'Long conversation',createdAt:Date.now(),draft:'A saved draft',messages:Array.from({length:100},(_,i)=>({id:String(i),role:i%2?'assistant':'user',content:i===99?'Long paragraph '.repeat(700):'A message in a long conversation.',at:Date.now(),status:'complete'}))}]}));},{once:true});location.reload();`,
);
await waitUntil('document.querySelectorAll(".message").length===100');
assert(
  await evaluate('document.querySelectorAll(".message").length===100'),
  "long conversation restores all messages",
);
assert(
  await evaluate('document.querySelector("#message-input").value==="A saved draft"'),
  "draft survives refresh",
);
assert(
  await evaluate("document.documentElement.scrollWidth<=innerWidth"),
  "long message stays inside viewport",
);
await call("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 600,
  deviceScaleFactor: 1,
  mobile: false,
});
await wait(100);
assert(
  await evaluate('document.querySelector("#composer").getBoundingClientRect().bottom<=innerHeight'),
  "composer stays visible in short mobile viewport",
);
await call("Page.navigate", { url: "http://127.0.0.1:8000/conversation" });
await waitUntil('document.querySelectorAll(".message").length===100');
assert(
  await evaluate('document.querySelectorAll(".message").length===100'),
  "direct conversation navigation restores history",
);
assert(errors.length === 0, "extended flows have no browser exceptions");
await evaluate("sessionStorage.removeItem('whiteeye:entrance:v2');location.reload()");
await wait(400);
assert(
  await evaluate('!document.querySelector("#entrance").open'),
  "reduced motion skips automatic entrance",
);
await call("Page.navigate", { url: "about:blank" });
await wait(100);
await call("Storage.clearDataForOrigin", {
  origin: "http://127.0.0.1:8000",
  storageTypes: "local_storage",
});
await call("Page.navigate", { url: "http://127.0.0.1:8000/" });
socket.close();
console.log(`Browser checks complete: ${assertionCount} passed.`);
