import shutil
import os

# Clean unused directories to keep each app lightweight and modular
to_clean = [
    # Passenger App doesn't need admin and driver pages
    ("apps/web-passenger/src/app/admin", True),
    ("apps/web-passenger/src/app/driver", True),
    
    # Admin App doesn't need passenger and driver pages
    ("apps/web-admin/src/app/passenger", True),
    ("apps/web-admin/src/app/driver", True),
    
    # Driver App doesn't need passenger and admin pages
    ("apps/mobile-driver/src/app/passenger", True),
    ("apps/mobile-driver/src/app/admin", True),
]

for path, is_dir in to_clean:
    if os.path.exists(path):
        if is_dir:
            shutil.rmtree(path)
            print(f"Removed directory: {path}")
        else:
            os.remove(path)
            print(f"Removed file: {path}")

print("Clean up completed.")
