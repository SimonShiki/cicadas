self.addEventListener('message', async (e) => {
    const result = Array.from(new Uint8Array(e.data));
    self.postMessage(result);
}, false);
