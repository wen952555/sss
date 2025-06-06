<template>
  <div id="app-container">
    <header>
      <h1>十三水在线</h1>
    </header>
    <main>
      <router-view />
    </main>
    <footer>
      <p>© 2023 多人十三水游戏</p>
    </footer>
  </div>
</template>

<script setup>
// No specific script needed here for basic layout
</script>

<style>
/* Global styles, or move to assets/main.css */
body {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  margin: 0;
  background-color: #f4f7f6;
  color: #333;
}

#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

header {
  background-color: #3498db;
  color: white;
  padding: 15px 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

header h1 {
  margin: 0;
  font-size: 1.8em;
}

main {
  flex-grow: 1;
  padding: 20px;
  max-width: 1200px; /* Max width for content */
  width: 100%;
  margin: 0 auto; /* Center content */
  box-sizing: border-box;
}

footer {
  background-color: #2c3e50;
  color: #ecf0f1;
  text-align: center;
  padding: 15px 20px;
  font-size: 0.9em;
}

button {
  /* Basic button styling */
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s;
}
button:hover:not(:disabled) {
  background-color: #2980b9;
}
button:disabled {
  background-color: #bdc3c7;
  cursor: not-allowed;
}

input[type="text"], select {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  margin-right: 5px; /* Spacing */
}
</style>
