const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { FilterWarningsPlugin } = require("webpack-5-filter-warnings-plugin");
const webpack = require("webpack");

module.exports = {
  entry: {
    index: path.resolve("src", "client", "index.tsx"),
  },
  mode: "development",
  cache: {
    type: "filesystem",
  },
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: { configFile: path.resolve("src", "client", "tsconfig.json") },
      },

      {
        test: /\.s(a|c)ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              modules: {
                localIdentName: "[path][name]__[local]--[hash:base64:10]",
                localIdentContext: path.resolve(__dirname, "src", "client"),
                exportLocalsConvention: "camelCase",
              },
              sourceMap: true,
            },
          },
          {
            loader: "sass-loader",
            options: {
              sourceMap: true,
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    path: path.resolve("lib", "client"),
    filename: "[name].bundle.js",
    chunkFilename: "[name].bundle.js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve("src", "client", "index.html"),
      favicon: path.resolve("src", "client", "favicon.png"),
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css",
    }),
    new FilterWarningsPlugin({
      exclude:
        /mini-css-extract-plugin[^]*Conflicting order. Following module has been added:/,
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
  ],
  devServer: {
    port: 3000,
    historyApiFallback: true,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.GJALLARHORN_PORT}`,
        ws: true,
      },
    },
  },
  optimization: {
    usedExports: true,
  },
};
