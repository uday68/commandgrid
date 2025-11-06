import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';

class ClassComponent extends Component {
  render() {
    const { t } = this.props;
    // Update with a proper translation key that exists in your translation files
    return <div>{t('common.message', { defaultValue: 'Default message' })}</div>;
  }
}

// Use the namespaces array to specify which namespaces to include
export default withTranslation(['translation', 'components'])(ClassComponent);
