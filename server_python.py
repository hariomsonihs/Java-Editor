from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import tempfile
import re
import shutil

app = Flask(__name__)
CORS(app)

@app.route('/compile', methods=['POST'])
def compile_java():
    data = request.json
    code = data.get('code', '')
    user_input = data.get('input', '')
    
    # Extract class name
    class_match = re.search(r'public\s+class\s+(\w+)', code)
    class_name = class_match.group(1) if class_match else 'Main'
    
    # Create temp directory
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Write Java file
        java_file = os.path.join(temp_dir, f'{class_name}.java')
        with open(java_file, 'w', encoding='utf-8') as f:
            f.write(code)
        
        # Compile
        compile_result = subprocess.run(
            ['javac', java_file],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if compile_result.returncode != 0:
            return jsonify({
                'success': False,
                'output': '',
                'error': compile_result.stderr
            })
        
        # Run
        run_result = subprocess.run(
            ['java', '-cp', temp_dir, class_name],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        return jsonify({
            'success': True,
            'output': run_result.stdout,
            'error': run_result.stderr
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            'success': False,
            'output': '',
            'error': 'Execution timeout (10 seconds)'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'output': '',
            'error': str(e)
        })
    finally:
        # Cleanup
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

if __name__ == '__main__':
    print('\n' + '='*50)
    print('  Java Editor Server Started!')
    print('='*50)
    print('Server: http://localhost:5000')
    print('Java JDK: Required (java & javac)')
    print('Status: Ready')
    print('='*50 + '\n')
    print('Open index.html in browser!')
    print('Keep this window open\n')
    
    app.run(host='0.0.0.0', port=5000, debug=False)
