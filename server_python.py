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
    filename = data.get('filename', '')
    
    # Extract class name from code
    class_match = re.search(r'public\s+class\s+(\w+)', code)
    if not class_match:
        return jsonify({
            'success': False,
            'output': '',
            'error': 'Error: No public class found in code'
        })
    
    class_name = class_match.group(1)
    
    # If filename provided, validate it matches class name
    if filename:
        expected_filename = f'{class_name}.java'
        if filename != expected_filename:
            return jsonify({
                'success': False,
                'output': '',
                'error': f'Error: Class name "{class_name}" does not match filename "{filename}".\nFilename must be "{expected_filename}" (case-sensitive)'
            })
    
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
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
