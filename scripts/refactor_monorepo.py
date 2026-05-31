import os
import shutil
import json

def make_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

# 1. Create directory structure
dirs = [
    "apps/web-passenger/src",
    "apps/web-admin/src",
    "apps/mobile-driver/src",
    "packages/api",
    "packages/shared",
    "packages/ui",
]

for d in dirs:
    make_dir(d)

print("Created folder structure.")

# 2. Relocate backend to packages/api
if os.path.exists("backend") and not os.path.exists("packages/api/src"):
    # Copy backend folder contents to packages/api
    for item in os.listdir("backend"):
        s = os.path.join("backend", item)
        d = os.path.join("packages/api", item)
        if os.path.isdir(s):
            shutil.copytree(s, d, dirs_exist_ok=True)
        else:
            shutil.copy2(s, d)
    print("Relocated backend to packages/api.")

# 3. Create package.json for packages/api if not exists
api_pkg = {
    "name": "@gozipp/api",
    "version": "1.0.2",
    "private": True,
    "scripts": {
        "dev": "nest start --watch --config nest-cli.json",
        "build": "nest build --config nest-cli.json",
        "start": "node dist/backend/main"
    },
    "dependencies": {
        "@nestjs/common": "^10.0.0",
        "@nestjs/config": "^3.1.1",
        "@nestjs/core": "^10.0.0",
        "@nestjs/jwt": "^11.0.2",
        "@nestjs/passport": "^11.0.5",
        "@nestjs/platform-express": "^10.0.0",
        "@nestjs/platform-socket.io": "^10.3.0",
        "@nestjs/serve-static": "^5.0.5",
        "@nestjs/throttler": "^5.1.1",
        "@nestjs/typeorm": "^10.0.1",
        "@nestjs/websockets": "^10.3.0",
        "@socket.io/redis-adapter": "^8.3.0",
        "bcrypt": "^6.0.0",
        "class-transformer": "^0.5.1",
        "class-validator": "^0.14.1",
        "ioredis": "^5.3.2",
        "pg": "^8.11.3",
        "reflect-metadata": "^0.1.13",
        "rxjs": "^7.8.1",
        "socket.io": "^4.7.4",
        "typeorm": "^0.3.19"
    }
}
with open("packages/api/package.json", "w") as f:
    json.dump(api_pkg, f, indent=2)

# 4. Populate shared package
shared_pkg = {
    "name": "@gozipp/shared",
    "version": "1.0.0",
    "private": True,
    "main": "index.ts"
}
with open("packages/shared/package.json", "w") as f:
    json.dump(shared_pkg, f, indent=2)

# Copy types and constants to packages/shared
if os.path.exists("src/types.ts"):
    shutil.copy2("src/types.ts", "packages/shared/types.ts")
if os.path.exists("src/constants.ts"):
    shutil.copy2("src/constants.ts", "packages/shared/constants.ts")

with open("packages/shared/index.ts", "w") as f:
    f.write("export * from './types';\nexport * from './constants';\n")

print("Created packages/shared.")

# 5. Populate web-passenger Next.js app
passenger_pkg = {
    "name": "@gozipp/passenger",
    "version": "1.0.2",
    "private": True,
    "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start"
    },
    "dependencies": {
        "next": "16.2.4",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "zustand": "^4.5.0",
        "socket.io-client": "^4.7.4",
        "lucide-react": "^0.312.0",
        "leaflet": "^1.9.4",
        "react-leaflet": "^4.2.1",
        "axios": "^1.16.1",
        "framer-motion": "^11.0.0"
    }
}
with open("apps/web-passenger/package.json", "w") as f:
    json.dump(passenger_pkg, f, indent=2)

# Copy Next.js configurations to apps/web-passenger
configs = ["next.config.js", "postcss.config.js", "tailwind.config.ts", "tsconfig.json", "next-env.d.ts"]
for config in configs:
    if os.path.exists(config):
        shutil.copy2(config, f"apps/web-passenger/{config}")

# Copy full src to apps/web-passenger/src
if os.path.exists("src"):
    shutil.copytree("src", "apps/web-passenger/src", dirs_exist_ok=True)
    print("Copied passenger frontend source.")

# 6. Populate web-admin Next.js app
admin_pkg = {
    "name": "@gozipp/admin",
    "version": "1.0.2",
    "private": True,
    "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start"
    },
    "dependencies": {
        "next": "16.2.4",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "lucide-react": "^0.312.0",
        "axios": "^1.16.1",
        "@google/genai": "^0.1.1",
        "framer-motion": "^11.0.0"
    }
}
with open("apps/web-admin/package.json", "w") as f:
    json.dump(admin_pkg, f, indent=2)

for config in configs:
    if os.path.exists(config):
        shutil.copy2(config, f"apps/web-admin/{config}")

# Copy admin components and src structure to apps/web-admin/src
shutil.copytree("src", "apps/web-admin/src", dirs_exist_ok=True)
print("Copied admin frontend source.")

# 7. Populate mobile-driver Next.js app
driver_pkg = {
    "name": "@gozipp/driver",
    "version": "1.0.2",
    "private": True,
    "scripts": {
        "dev": "next dev",
        "build": "next build",
        "start": "next start"
    },
    "dependencies": {
        "next": "16.2.4",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "zustand": "^4.5.0",
        "socket.io-client": "^4.7.4",
        "lucide-react": "^0.312.0",
        "leaflet": "^1.9.4",
        "react-leaflet": "^4.2.1",
        "axios": "^1.16.1",
        "framer-motion": "^11.0.0"
    }
}
with open("apps/mobile-driver/package.json", "w") as f:
    json.dump(driver_pkg, f, indent=2)

for config in configs:
    if os.path.exists(config):
        shutil.copy2(config, f"apps/mobile-driver/{config}")

shutil.copytree("src", "apps/mobile-driver/src", dirs_exist_ok=True)
print("Copied driver frontend source.")

print("Monorepo files separation completed.")
