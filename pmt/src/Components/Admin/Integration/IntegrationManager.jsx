// src/components/IntegrationManager.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIntegrations } from '../integrations/IntegrationSystem';
import { Spinner, Modal, Button, Input } from '../components/Common';

const IntegrationCard = ({ integration }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({});
  const { connections, refreshConnections } = useIntegrations();

  const handleConnect = async () => {
    setLoading(true);
    try {
      if (integration.authType === 'oauth2') {
        await integration.connect();
      } else {
        await integration.connect(credentials);
      }
      await refreshConnections();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="integration-card">
      <div className="integration-header">
        <span className="integration-icon">{integration.icon}</span>
        <h3>{integration.name}</h3>
        <span className={`status-dot ${connections[integration.id] ? 'connected' : 'disconnected'}`} />
      </div>

      {integration.authType === 'api_token' && (
        <div className="credentials-form">
          {integration.fields.map((field) => (
            <Input
              key={field}
              label={t(`integrations.fields.${field}`)}
              type={field.includes('key') ? 'password' : 'text'}
              value={credentials[field] || ''}
              onChange={(e) => setCredentials({ ...credentials, [field]: e.target.value })}
            />
          ))}
        </div>
      )}

      <Button 
        variant={connections[integration.id] ? 'danger' : 'primary'}
        onClick={handleConnect}
        disabled={loading}
      >
        {loading ? (
          <Spinner size="small" />
        ) : connections[integration.id] ? (
          t('integrations.disconnect')
        ) : (
          t('integrations.connect')
        )}
      </Button>
    </div>
  );
};

export const IntegrationManager = () => {
  const { t } = useTranslation();
  const { integrations } = useIntegrations();
  const [showConfig, setShowConfig] = useState(null);

  return (
    <div className="integration-manager">
      <h2>{t('integrations.title')}</h2>
      <div className="integration-grid">
        {integrations.map((integration) => (
          <IntegrationCard 
            key={integration.id} 
            integration={integration}
          />
        ))}
      </div>

      <Modal
        open={!!showConfig}
        onClose={() => setShowConfig(null)}
      >
        {showConfig && <IntegrationConfigModal config={showConfig} />}
      </Modal>
    </div>
  );
};