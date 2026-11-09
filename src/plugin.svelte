
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { map } from '@windy/map';
    import config from './pluginConfig';

    let kmlLayer: any = null;
    let loaded = false;
    let errorMsg = '';

    const HOST_LOCAL = '127.0.0.1:9999';
    const KML_URL = `https://${HOST_LOCAL}/sbeg.kml`;

    // Centro atualizado conforme o deslocamento aplicado ao KML:
    // 25 metros para sul e 14 metros para leste.
    const MAP_CENTER: [number, number] = [
        -3.03122458,
        -60.04187406
    ];

    // Define a aparência dos círculos de acordo com a distância.
    function getLayerStyle(name: string) {
        const match = name.match(/(\d+(?:\.\d+)?)/);
        const distance = match ? parseFloat(match[1]) : 0;

        let color = '#ff9900'; // Laranja: círculos de 3 km a 20 km.
        let weight = 1.5;

        // Círculos de 0 a 2 km: azul.
        if (distance >= 0 && distance <= 2) {
            color = '#00aaff';
        }

        // Círculos de 8 km e 16 km: vermelho.
        if (distance === 8 || distance === 16) {
            color = '#ff0000';
            weight = 4;
        }

        return {
            color,
            weight,
            opacity: 1,
            pane: 'overlayPane'
        };
    }

    function parseKmlToLeaflet(kmlDoc: Document) {
        // @ts-ignore
        const group = new L.FeatureGroup();

        const placemarks = kmlDoc.getElementsByTagName('*');
        let validElements = 0;

        for (let i = 0; i < placemarks.length; i++) {
            const el = placemarks[i];

            if (el.localName !== 'Placemark') {
                continue;
            }

            const nameNode = el.getElementsByTagNameNS('*', 'name')[0];
            const name = nameNode
                ? nameNode.textContent || ''
                : 'Anel';

            const coordNode = el.getElementsByTagNameNS('*', 'coordinates')[0];

            if (!coordNode || !coordNode.textContent) {
                continue;
            }

            const coordsStr = coordNode.textContent.trim();

            if (!coordsStr) {
                continue;
            }

            const coordinatePairs = coordsStr.split(/[\s\n\r]+/);
            const latLngs: [number, number][] = [];

            for (const pair of coordinatePairs) {
                if (!pair.trim()) continue;

                const parts = pair.split(',');

                if (parts.length >= 2) {
                    const lng = Number(parts[0].trim());
                    const lat = Number(parts[1].trim());

                    if (
                        Number.isFinite(lat) &&
                        Number.isFinite(lng) &&
                        lat >= -90 && lat <= 90 &&
                        lng >= -180 && lng <= 180
                    ) {
                        latLngs.push([lat, lng]);
                    }
                }
            }

            if (latLngs.length === 1) {
                // Pontos de referência.
                // @ts-ignore
                const marker = new L.Marker(latLngs[0])
                    .bindPopup(`<strong>${name}</strong>`);

                group.addLayer(marker);
                validElements++;

            } else if (latLngs.length > 1) {
                // Círculos e anéis.
                const styleOptions = getLayerStyle(name);

                // @ts-ignore
                const polyline = new L.Polyline(
                    latLngs,
                    styleOptions
                ).bindPopup(`<strong>${name}</strong>`);

                group.addLayer(polyline);
                validElements++;
            }
        }

        console.log(
            `[SBEG] Total de elementos renderizados: ${validElements}`
        );

        if (validElements === 0) {
            throw new Error(
                'O KML foi lido, mas nenhuma coordenada válida foi encontrada.'
            );
        }

        return group;
    }

    async function loadKml() {
        errorMsg = '';
        loaded = false;

        try {
            const response = await fetch(KML_URL, {
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP Erro: ${response.status}`);
            }

            const kmlText = await response.text();

            const parser = new DOMParser();
            const kmlDoc = parser.parseFromString(
                kmlText,
                'application/xml'
            );

            // Verifica se o XML possui erros de interpretação.
            const parserError = kmlDoc.getElementsByTagName(
                'parsererror'
            );

            if (parserError.length > 0) {
                throw new Error(
                    'O arquivo KML contém um erro de estrutura XML.'
                );
            }

            // Remove a camada anterior antes de carregar a nova.
            if (kmlLayer) {
                map.removeLayer(kmlLayer);
                kmlLayer = null;
            }

            // Converte as coordenadas do KML em elementos Leaflet.
            kmlLayer = parseKmlToLeaflet(kmlDoc);

            map.addLayer(kmlLayer);

            // Centraliza o mapa no centro atualizado dos círculos.
            map.setView(MAP_CENTER, 12);

            loaded = true;

            console.log('[SBEG] KML carregado com sucesso.');

        } catch (err: any) {
            console.error('[SBEG] Falha ao carregar KML:', err);

            errorMsg = err.message ||
                'Erro de comunicação de rede';

            loaded = false;
        }
    }

    onMount(() => {
        loadKml();
    });

    onDestroy(() => {
        if (kmlLayer) {
            map.removeLayer(kmlLayer);
            kmlLayer = null;
        }
    });
</script>

<div class="plugin-container">
    <div class="header">
        <strong>{config.title}</strong>
    </div>

    {#if errorMsg}
        <div class="error">
            Erro: {errorMsg}
        </div>
    {:else if loaded}
        <div class="status">
            ✓ Anéis e pontos de referência carregados
        </div>
    {:else}
        <div class="status">
            Carregando KML...
        </div>
    {/if}

    <div class="info">
        <small>
            Centro: 3.03122458°S / 60.04187406°W<br />
            Anéis de 200 m até 20 km + pontos de referência
        </small>
    </div>
</div>

<style>
    .plugin-container {
        padding: 12px 16px;
        background: rgba(30, 30, 30, 0.92);
        color: #eee;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        border-radius: 8px;
        max-width: 280px;
    }

    .header {
        font-size: 14px;
        margin-bottom: 8px;
        color: #fff;
    }

    .status {
        color: #7dcea0;
        margin-bottom: 8px;
    }

    .error {
        color: #f1948a;
        margin-bottom: 8px;
    }

    .info {
        color: #aaa;
        line-height: 1.4;
    }
</style>
