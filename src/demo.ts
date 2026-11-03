import { emptyData, now, uuid, autoLayout, type Data } from "./domain";
import type { Store } from "./storage";
function garmentSVG(shape: number, color: string) {
  const paths = [
    "M125 35L175 35L195 103L182 225L155 225L150 130L145 225L118 225L105 103Z",
    "M112 45L135 32L165 32L188 45L220 93L195 112L181 90L184 210L116 210L119 90L105 112L80 93Z",
    "M122 45Q150 0 178 45L200 54L219 180L190 188L181 100L184 222L116 222L119 100L110 188L81 180L100 54Z",
    "M75 165L118 112L153 125L174 159L218 172Q239 179 223 202L81 202Q60 196 75 165Z",
    "M109 43L135 30L165 30L191 43L222 174L192 182L180 95L184 218L116 218L120 95L108 182L78 174Z",
    "M105 70L130 52L170 52L195 70L203 120L180 128L178 213L122 213L120 128L97 120Z",
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 300 260" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="#e8e1d6"/><stop offset="1" stop-color="#c6bcae"/></linearGradient><linearGradient id="f"><stop stop-color="${color}"/><stop offset=".5" stop-color="${color}" stop-opacity=".8"/><stop offset="1" stop-color="${color}"/></linearGradient><filter id="s"><feDropShadow dx="3" dy="8" stdDeviation="5" flood-opacity=".16"/></filter></defs><rect width="300" height="260" fill="url(#b)"/><ellipse cx="150" cy="237" rx="85" ry="7" fill="#85796b" opacity=".18"/><path d="${paths[shape]}" fill="url(#f)" stroke="#000" stroke-opacity=".12" stroke-width="1.5" filter="url(#s)"/><path d="M150 62L150 203M122 91Q150 110 178 91" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="2"/></svg>`;
}
export async function seedDemo(store: Store): Promise<Data> {
  const d = emptyData();
  const names = [
      "Mezclilla de todos los días",
      "Playera esencial",
      "Hoodie de domingo",
      "Tenis de siempre",
      "Camisa de lino",
      "Playera de entrenamiento",
    ],
    colors = ["#354451", "#f1eee8", "#3d4141", "#eeeae4", "#afa58f", "#635a67"],
    cats = [0, 2, 3, 5, 7, 2];
  for (let i = 0; i < names.length; i++) {
    const svg = new Blob([garmentSVG(i, colors[i])], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svg);
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 600;
    canvas.getContext("2d")!.drawImage(img, 0, 0, 600, 600);
    URL.revokeObjectURL(url);
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/png"),
    );
    const key = await store.putPhoto(blob, "demo");
    d.garments.push({
      id: uuid(),
      name: names[i],
      categoryId: `cat-${cats[i]}`,
      photos: [
        {
          id: uuid(),
          original: key,
          name: "ilustracion-demo.png",
          mime: "image/png",
          width: 600,
          height: 600,
        },
      ],
      color: ["Azul", "Blanco", "Negro", "Blanco", "Beige", "Morado"][i],
      brand: "",
      size: "M",
      tags: ["ejemplo"],
      notes:
        "Prenda de demostración. Ilustración sintética, no fotografía personal.",
      favorite: i === 0 || i === 3,
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      updatedAt: now(),
    });
  }
  d.outfits = [
    {
      id: uuid(),
      name: "Sin prisa",
      classificationId: "type-1",
      pieces: autoLayout([
        d.garments[1].id,
        d.garments[0].id,
        d.garments[3].id,
      ]),
      photos: [],
      notes: "Un ejemplo para comenzar. Puedes editarlo o crear el tuyo.",
      favorite: true,
      createdAt: now(),
      updatedAt: now(),
    },
  ];
  return d;
}
