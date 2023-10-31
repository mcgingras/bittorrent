async function runByTimeOrThrow(fn, time) {
  async function timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Operation timed out after " + ms + "ms"));
      }, ms);
    });
  }

  const value = await Promise.race([fn(), timeout(time)]);
  return value;
}

const fn = () =>
  new Promise((resolve) => setTimeout(() => resolve("nice"), 500));

const main = async () => {
  const value = await runByTimeOrThrow(fn, 1000);
  console.log("value", value);
};

main();
