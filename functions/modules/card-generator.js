// functions/modules/card-generator.js
// PNG Summary Card Generation using satori + @resvg/resvg-wasm

import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';

let wasmInitialized = false;
async function ensureWasmInit() {
    if (!wasmInitialized) {
        await initWasm(resvgWasm);
        wasmInitialized = true;
    }
}

// Font cache
let fontData = null;

async function loadFont() {
    if (fontData) return;
    const res = await fetch('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans@latest/latin-700-normal.woff');
    fontData = await res.arrayBuffer();
}

// Card dimensions
const W = 1200;
const H = 700;

export async function generateSummaryCard(followersCount, followingCount, mutualCount, notBackCount) {
    await ensureWasmInit();
    await loadFont();

    const followBackRate = followingCount > 0
        ? (mutualCount / followingCount * 100).toFixed(1)
        : '0.0';
    const rateWidth = Math.min(100, parseFloat(followBackRate));

    const element = {
        type: 'div',
        props: {
            style: {
                width: W,
                height: H,
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(180deg, #0B0E23 0%, #070A1C 100%)',
                fontFamily: 'NotoSans',
                color: '#FFFFFF',
                padding: '30px',
            },
            children: [
                // Title
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            height: '50px',
                            borderRadius: '12px',
                            backgroundColor: '#1A2250',
                            border: '2px solid #50A0FF',
                            paddingLeft: '20px',
                            marginBottom: '24px',
                        },
                        children: [
                            {
                                type: 'span',
                                props: {
                                    style: { fontSize: '24px', fontWeight: 700, color: '#FFFFFF' },
                                    children: '📊 Facebook Followers Analysis Result'
                                }
                            }
                        ]
                    }
                },
                // Stats tiles
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '24px',
                        },
                        children: [
                            makeTile(followersCount, 'FOLLOWERS', '#50A0FF'),
                            makeTile(followingCount, 'FOLLOWING', '#FFC832'),
                            makeTile(mutualCount, 'MUTUAL', '#28DC6E'),
                            makeTile(notBackCount, 'NOT BACK', '#FF4B4B'),
                        ]
                    }
                },
                // Progress bar
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            marginBottom: '24px',
                        },
                        children: [
                            {
                                type: 'div',
                                props: {
                                    style: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
                                    children: [
                                        {
                                            type: 'span',
                                            props: {
                                                style: { fontSize: '16px', fontWeight: 700, color: '#A0AAD2' },
                                                children: 'FOLLOW-BACK RATE'
                                            }
                                        },
                                        {
                                            type: 'span',
                                            props: {
                                                style: { fontSize: '16px', fontWeight: 700, color: '#28DC6E' },
                                                children: `${followBackRate}%`
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                type: 'div',
                                props: {
                                    style: {
                                        width: '100%',
                                        height: '24px',
                                        borderRadius: '12px',
                                        backgroundColor: '#323C64',
                                        display: 'flex',
                                    },
                                    children: [
                                        {
                                            type: 'div',
                                            props: {
                                                style: {
                                                    width: `${rateWidth}%`,
                                                    height: '100%',
                                                    backgroundColor: '#28DC6E',
                                                    borderRadius: '12px',
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                },
                // Channel promo
                {
                    type: 'div',
                    props: {
                        style: {
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: '12px',
                            backgroundColor: '#12183C',
                            border: '1px solid #32418C',
                            padding: '16px 20px',
                        },
                        children: [
                            {
                                type: 'span',
                                props: {
                                    style: { fontSize: '18px', fontWeight: 700, color: '#FFC832', marginBottom: '6px' },
                                    children: '📢 @illumoria_1'
                                }
                            },
                            {
                                type: 'span',
                                props: {
                                    style: { fontSize: '14px', color: '#A0AAD2' },
                                    children: 'Join our Telegram channel for more tools and updates!'
                                }
                            }
                        ]
                    }
                }
            ]
        }
    };

    const svg = await satori(element, {
        width: W,
        height: H,
        fonts: [
            {
                name: 'NotoSans',
                data: fontData,
                weight: 700,
                style: 'normal',
            }
        ],
    });

    const resvg = new Resvg(svg, {
        fitTo: { mode: 'width', value: W },
    });

    const pngData = resvg.render();
    return pngData.asPng();
}

function makeTile(count, label, color) {
    return {
        type: 'div',
        props: {
            style: {
                width: '260px',
                height: '200px',
                borderRadius: '14px',
                backgroundColor: '#141A3A',
                border: `1px solid ${color}33`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            },
            children: [
                {
                    type: 'div',
                    props: {
                        style: { fontSize: '52px', fontWeight: 700, color: color, marginBottom: '10px' },
                        children: count.toLocaleString()
                    }
                },
                {
                    type: 'div',
                    props: {
                        style: {
                            fontSize: '14px',
                            fontWeight: 700,
                            color: color,
                            backgroundColor: `${color}22`,
                            borderRadius: '6px',
                            padding: '4px 12px',
                        },
                        children: label
                    }
                }
            ]
        }
    };
}
