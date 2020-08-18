/**
 * Copyright IBM Corp. 2019, 2019
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const { camelCase } = require('change-case');
const fs = require('fs-extra');
const path = require('path');
const { rollup } = require('rollup');
const babel = require('rollup-plugin-babel');
const virtual = require('../plugins/virtual');

const BANNER = `/**
 * Copyright IBM Corp. 2019, 2020
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Code generated by @carbon/icon-build-helpers. DO NOT EDIT.
 */`;
const external = ['@carbon/icon-helpers', 'react', 'prop-types'];
const babelConfig = {
  babelrc: false,
  exclude: /node_modules/,
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          browsers: ['extends browserslist-config-carbon'],
        },
      },
    ],
    '@babel/preset-react',
  ],
  plugins: [
    '@babel/plugin-transform-react-constant-elements',
    'babel-plugin-dev-expression',
  ],
};

async function builder(metadata, { output }) {
  const modules = metadata.icons.flatMap((icon) => {
    return icon.output.map((size) => {
      const { source } = createIconComponent(
        size.moduleName,
        size.descriptor,
        icon.deprecated
      );
      return {
        source,
        filepath: size.filepath,
        moduleName: size.moduleName,
      };
    });
  });

  const files = {
    'index.js': `${BANNER}\n\nexport { default as Icon } from './Icon.js';`,
  };
  const input = {
    'index.js': 'index.js',
  };
  for (const m of modules) {
    const file = `${BANNER}
      import React from 'react';
      import Icon from './Icon.js';
      ${m.source}
      export default ${m.moduleName};
    `;

    files[m.filepath] = file;
    input[m.filepath] = m.filepath;
    files[
      'index.js'
    ] += `\nexport { default as ${m.moduleName} } from '${m.filepath}';`;
  }

  const bundle = await rollup({
    input: input,
    external,
    plugins: [
      virtual({
        './Icon.js': await fs.readFile(
          path.resolve(__dirname, './components/Icon.js'),
          'utf8'
        ),
        ...files,
      }),
      babel(babelConfig),
    ],
  });

  const bundles = [
    {
      directory: path.join(output, 'es'),
      format: 'esm',
    },
    {
      directory: path.join(output, 'lib'),
      format: 'commonjs',
    },
  ];

  for (const { directory, format } of bundles) {
    const outputOptions = {
      dir: directory,
      format,
      entryFileNames: '[name]',
      banner: BANNER,
    };

    await bundle.write(outputOptions);
  }

  const umd = await rollup({
    input: 'index.js',
    external,
    plugins: [
      virtual({
        './Icon.js': await fs.readFile(
          path.resolve(__dirname, './components/Icon.js'),
          'utf8'
        ),
        ...files,
      }),
      babel(babelConfig),
    ],
  });

  await umd.write({
    file: path.join(output, 'umd/index.js'),
    format: 'umd',
    name: 'CarbonIconsReact',
    globals: {
      '@carbon/icon-helpers': 'CarbonIconHelpers',
      'prop-types': 'PropTypes',
      react: 'React',
    },
  });
}

/**
 * Generate an icon component, which in our case is the string representation
 * of the component, from a given moduleName and icon descriptor.
 * @param {string} moduleName
 * @param {object} descriptor
 * @param {boolean} [isDeprecated]
 * @returns {object}
 */
function createIconComponent(moduleName, descriptor, isDeprecated = false) {
  const { attrs, content } = descriptor;
  const { width, height, viewBox, ...rest } = attrs;

  const deprecatedTopLevel = isDeprecated
    ? 'let didWarnAboutDeprecation = false;'
    : '';
  const deprecatedBlock = isDeprecated
    ? `
    if (__DEV__) {
      if (!didWarnAboutDeprecation) {
        didWarnAboutDeprecation = true;
        console.warn(
          \`The ${moduleName} component has been deprecated and will be \` +
          \`removed in the next major version of @carbon/icons-react.\`
        );
      }
    }
    `
    : '';

  const source = `
    ${deprecatedTopLevel}
    const ${moduleName} = /*#__PURE__*/ React.forwardRef(
      function ${moduleName}({ children, ...rest }, ref) {
        ${deprecatedBlock}
        return (
          <Icon
            width={${width}}
            height={${height}}
            viewBox="${viewBox}"
            ${formatAttributes(rest)}
            ref={ref}
            {...rest}>
            ${content.map(convertToJSX).join('\n')}
            {children}
          </Icon>
        );
      }
    );
  `;

  return {
    source,
  };
}

/**
 * Convert the given node to a JSX string source
 * @param {object} node
 * @returns {string}
 */
function convertToJSX(node) {
  const { elem, attrs } = node;
  return `<${elem} ${formatAttributes(attrs)} />`;
}

const attributeDenylist = ['data', 'aria'];

/**
 * Determine if the given attribute should be transformed when being converted
 * to a React prop or if we should pass it through as-is
 * @param {string} attribute
 * @returns {boolean}
 */
function shouldTransformAttribute(attribute) {
  return attributeDenylist.every((prefix) => !attribute.startsWith(prefix));
}

/**
 * Serialize a given object of key, value pairs to an JSX-compatible string
 * @param {object} attrs
 * @returns {string}
 */
function formatAttributes(attrs) {
  return Object.keys(attrs).reduce((acc, key, index) => {
    const attribute = shouldTransformAttribute(key)
      ? `${camelCase(key)}="${attrs[key]}"`
      : `${key}="${attrs[key]}"`;

    if (index === 0) {
      return attribute;
    }
    return acc + ' ' + attribute;
  }, '');
}

module.exports = builder;
