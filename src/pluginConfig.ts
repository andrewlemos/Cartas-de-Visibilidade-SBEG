import type { ExternalPluginConfig } from '@windy/interfaces';

const config: ExternalPluginConfig = {
    name: 'windy-plugin-sbeg-visibilidade',
    version: '1.0.0',
    title: 'SBEG - Carta de Visibilidade',
    icon: '🛫',
    description: 'Cartas de visibilidade do aeroporto Eduardo Gomes (SBEG) - Manaus',
    author: 'Andrew Lemos',
    desktopUI: 'embedded',
    mobileUI: 'small',
    routerPath: '/sbeg-visibilidade',
    private: false,
};

export default config;