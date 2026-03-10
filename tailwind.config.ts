import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ac:  "var(--ac)",
        acl: "var(--acl)",
        ach: "var(--ach)",
        bg:  "var(--bg)",
        bgs: "var(--bgs)",
        bgm: "var(--bgm)",
        bdr: "var(--bdr)",
        t:   "var(--t)",
        t2:  "var(--t2)",
        tm:  "var(--tm)",
        ok:  "var(--ok)",
        okl: "var(--okl)",
        wa:  "var(--wa)",
        wal: "var(--wal)",
        er:  "var(--er)",
        erl: "var(--erl)",
      },
      fontFamily: {
        sans: ["var(--f)"],
        mono: ["var(--m)"],
      },
      borderRadius: {
        DEFAULT: "var(--r)",
        sm: "var(--r2)",
      },
      boxShadow: {
        card: "var(--sh)",
        modal: "var(--sh2)",
      },
    },
  },
  plugins: [],
};

export default config;
