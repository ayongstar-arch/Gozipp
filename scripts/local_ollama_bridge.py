import sys
import json
import urllib.request

def call_ollama(model, system_prompt, user_prompt, files):
    # Construct the combined user prompt with file contents
    full_user_prompt = ""
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            full_user_prompt += f"--- FILE: {file_path} ---\n{content}\n--- END FILE ---\n\n"
        except Exception as e:
            print(f"Error reading file {file_path}: {e}", file=sys.stderr)
            
    full_user_prompt += f"Instruction: {user_prompt}\n\n"
    full_user_prompt += "Please output the modified code blocks. Use standard markdown code blocks with file path headers."

    url = "http://localhost:11434/api/generate"
    data = {
        "model": model,
        "system": system_prompt,
        "prompt": full_user_prompt,
        "stream": False,
        "options": {
            "temperature": 0.2
        }
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            return res_data.get("response", "")
    except Exception as e:
        print(f"Error calling Ollama: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    if len(sys.argv) < 3:
        print("Usage: python local_ollama_bridge.py <model> <system_prompt_file> <user_prompt> [file1 file2 ...]")
        sys.exit(1)
        
    model = sys.argv[1]
    sys_prompt_file = sys.argv[2]
    user_prompt = sys.argv[3]
    files = sys.argv[4:]
    
    try:
        with open(sys_prompt_file, 'r', encoding='utf-8') as f:
            system_prompt = f.read()
    except Exception as e:
        print(f"Error reading system prompt file {sys_prompt_file}: {e}", file=sys.stderr)
        sys.exit(1)
        
    response = call_ollama(model, system_prompt, user_prompt, files)
    print(response)
