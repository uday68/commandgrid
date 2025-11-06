import React, { Component } from 'react';
import { withTranslation } from 'react-i18next';

class ClassComponent extends Component {
  render() {
    const { t } = this.props;
    return (
      <div>
        <h1>{t('welcome_message')}</h1>
      </div>
    );
  }
}

export default withTranslation()(ClassComponent);