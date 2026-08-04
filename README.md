# 🎯 Blacksite: Fallen City — 3D Browser FPS Game

An action-packed, fast-paced 3D First-Person Shooter (FPS) game built for the web using **Three.js**, **React 19**, **TypeScript**, and **Vite**. Features 3D GLTF character & mecha models with skeletal animation, tactical movement mechanics, interactive campaign objectives, dynamic day/night atmospheric weather systems, and synthesized audio effects.

---

## ✨ Features & Highlights

- 🤖 **3D GLTF Models & Skeletal Animations**: 
  - Integrated animated 3D **Soldier** models for infantry scouts, troopers, and marksmen.
  - Integrated animated 3D **Robot Mecha** models for heavy enforcers and the Warden Boss.
- ⚡ **Tactical Movement & Combat Physics**:
  - High-velocity **Dash** with camera FOV punch.
  - Tactical **Slide** with dynamic friction decay when crouching during a sprint.
  - **Iron Sights Aim Down Sights (ADS)** with smooth camera zoom.
- 🔫 **Arsenal & Weapons**:
  - **Tactical Pistol**: Fast sidearm precision.
  - **Assault Rifle**: Automatic rapid-fire rifle with recoil recovery.
  - **Double-Barrel Shotgun**: High close-range pellet spread damage.
  - **Cyber Sniper**: High-caliber long-range scope precision.
  - **Rocket Launcher (Bazooka)**: Explosive area-of-effect damage.
- 💥 **Tactical Abilities**:
  - **EMP Shockwave**: Electric wave blast that stuns surrounding enemies in a 14m radius.
  - **Frag Grenade**: Physical parabolic arc grenade toss with area damage.
- 🌆 **Atmospheric World & Campaign**:
  - Dynamic procedural **Day/Night Cycle** (Dusk, Midnight, Storm, Dawn).
  - 5 Campaign Stages with terminal console hacks, keycards, jammer overrides, and extraction LZ portals.
- 🎧 **Synthesized Audio Engine**:
  - Custom Web Audio API sound synthesizer for gunshots, reload chimes, footstep swishes, dash swooshes, and hit markers.
- 🗺️ **Tactical HUD & Minimap**:
  - Live minimap radar with real-time enemy positions, objective markers, health/shield bars, killfeed, and headshot hit indicators.

---

## 🎮 Controls

| Action | Keyboard / Mouse |
| :--- | :--- |
| **Movement** | `W` `A` `S` `D` |
| **Look / Aim** | `Mouse Movement` |
| **Fire Weapon** | `Left Click` |
| **Aim Down Sights (ADS)** | `Right Click` |
| **Sprint** | `Left Shift` |
| **Crouch / Slide** | `C` |
| **Jump** | `Spacebar` |
| **Dash Burst** | `F` |
| **EMP Shockwave** | `E` |
| **Throw Grenade** | `G` |
| **Reload** | `R` |
| **Switch Weapon** | `1` `2` `3` `4` `5` |

---

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **3D Graphics Engine**: [Three.js](https://threejs.org/) (WebGL, PCF Soft Shadows, FogExp2)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons & Animations**: [Lucide React](https://lucide.dev/), [Framer Motion](https://www.framer.com/motion/)

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hmad28/fps.git
   cd fps
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set Environment Variables**:
   Copy `.env.example` to `.env.local` and add your Gemini API Key if using AI features:
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## 🌐 Deploying to Production

This is a static web application and can be hosted for **100% FREE** on modern web hosting platforms:

### Deploy to Vercel (Recommended)
1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import the `hmad28/fps` repository.
4. Click **Deploy**.

### Deploy to Netlify
1. Run `npm run build` locally to generate the `dist` folder.
2. Go to [Netlify](https://netlify.com) and drag & drop the `dist` folder into **Sites**.

---

## 📜 License

Distributed under the MIT License. Feel free to modify and expand the game!
