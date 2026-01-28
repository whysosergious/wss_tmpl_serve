export const sh = {
  components: {},
  test_log: () => console.log("test log"),
};
globalThis.sh = sh; // For debug purposes
export default sh;
