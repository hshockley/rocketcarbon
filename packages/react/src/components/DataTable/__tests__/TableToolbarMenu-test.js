/**
 * Copyright IBM Corp. 2016, 2018
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { mount } from 'enzyme';
import { Download16 } from '@rocketsoftware/icons-react';
import { TableToolbarMenu } from '..';

describe('DataTable.TableToolbarMenu', () => {
  it('should render', () => {
    const wrapper = mount(
      <TableToolbarMenu
        className="custom-class"
        renderIcon={Download16}
        iconDescription="Add">
        <span>test</span>
      </TableToolbarMenu>
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Custom icon in DataTable.TableToolbarMenu', () => {
  it('should render', () => {
    const iconAction = mount(
      <TableToolbarMenu renderIcon={Download16} iconDescription="Download">
        <span>test</span>
      </TableToolbarMenu>
    );
    const originalIcon = mount(<Download16 />).find('svg');
    const icon = iconAction.find('svg');
    expect(icon.getDOMNode().querySelectorAll(':not(svg):not(title)')).toEqual(
      originalIcon.getDOMNode().querySelectorAll(':not(svg):not(title)')
    );
  });
});
