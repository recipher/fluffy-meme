const sleep = (fn, ms) => new Promise((resolve) => setTimeout(() => resolve(fn()), ms));

export default async (fn, max) => {
  const execute = async attempt => {
    try {
      return await fn();
    } catch(e) {
      if (attempt <= max) {
        const next = attempt+1;
        console.error(`Retrying...`, e.name);
        return sleep(() => execute(next), 1000);
      } else {
        throw e;
      }
    }
  }
  return execute(1);
};