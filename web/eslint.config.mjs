import next from "eslint-config-next";

export default [
  ...next,
  {
    ignores: ["node_modules/**", ".next/**", "src/__tests__/**"],
  },
  {
    rules: {
      // Fetch-on-mount + interval polling is the intended pattern for
      // live corridor/agent tracking; the new React 19 rules flag it
      // as cascading renders, which does not apply here.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
];
