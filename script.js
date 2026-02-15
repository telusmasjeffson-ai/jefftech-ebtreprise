import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// Wise form
const tauxWise = 135;
const montantInput = document.getElementById("montant");
const totalText = document.getElementById("total");
const preuveInput = document.getElementById("preuve");
const form = document.getElementById("wiseForm");

if (montantInput) {
  montantInput.addEventListener("input", function() {
    const montant = montantInput.value;
    totalText.textContent = "Total pou peye: " + (montant * tauxWise) + " HTG";
  });
}

if (preuveInput) {
  preuveInput.addEventListener("change", function() {
    const file = preuveInput.files[0];
    if(file) {
      const reader = new FileReader();
      reader.onload = function(e){
        document.getElementById("preview").src = e.target.result;
        document.getElementById("preview").style.display = "block";
      }
      reader.readAsDataURL(file);
    }
  });
}

if (form) {
  form.addEventListener("submit", async function(e){
    e.preventDefault();

    const nom = document.getElementById("nom").value;
    const email = document.getElementById("email").value;
    const montant = document.getElementById("montant").value;
    const file = preuveInput.files[0];

    const storageRef = ref(storage, "preuves/" + Date.now() + "-" + file.name);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    await addDoc(collection(db, "demandes"), {
      nom: nom,
      email: email,
      montant: montant,
      total: montant * tauxWise,
      type: "wise",
      preuveURL: downloadURL,
      status: "pending",
      date: new Date()
    });

    // WhatsApp notification
    const phoneAdmin = "509XXXXXXXX";
    const message = `Nou gen nouvo demann:\nNom: ${nom}\nEmail: ${email}\nMontan: ${montant} USD\nTotal: ${montant*tauxWise} HTG`;
    window.open(`https://wa.me/${phoneAdmin}?text=${encodeURIComponent(message)}`,"_blank");

    alert("Demann voye avèk siksè!");
    form.reset();
    document.getElementById("preview").style.display = "none";
    totalText.textContent = "";
  });
}

// Admin login
const loginBtn = document.getElementById("loginBtn");
if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("adminEmail").value;
    const password = document.getElementById("adminPassword").value;
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "admin-dashboard.html";
  });
}

// Admin dashboard
const listDiv = document.getElementById("list");
if (listDiv) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("Ou dwe login pou gen aksè!");
      window.location.href = "admin-login.html";
    } else {
      const snapshot = await getDocs(collection(db, "demandes"));
      const demandes = [];
      snapshot.forEach(docItem => {
        const d = docItem.data();
        d.id = docItem.id;
        demandes.push(d);

        const div = document.createElement("div");
        div.innerHTML = `
          <p><strong>${d.nom}</strong> - ${d.montant} USD - ${d.status}</p>
          <img src="${d.preuveURL}" width="150">
          <button class="approveBtn">Approve</button>
          <button class="rejectBtn">Reject</button>
          <hr>
        `;
        listDiv.appendChild(div);

        div.querySelector(".approveBtn").addEventListener("click", async () => {
          await updateDoc(doc(db, "demandes", d.id), { status: "approved" });
          alert("Demann Apwouve!");
          location.reload();
        });

        div.querySelector(".rejectBtn").addEventListener("click", async () => {
          await updateDoc(doc(db, "demandes", d.id), { status: "rejected" });
          alert("Demann Rejte!");
          location.reload();
        });
      });

      // Graph
      function createChart(canvasId, typeName) {
        const filtered = demandes.filter(d => d.type === typeName);
        const labels = filtered.map(d => d.nom);
        const data = filtered.map(d => d.total);
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: typeName.toUpperCase() + ' Total HTG',
              data: data,
              backgroundColor: 'rgba(0, 245, 160, 0.5)',
              borderColor: 'rgba(0, 245, 160, 1)',
              borderWidth: 1
            }]
          },
          options: { scales: { y: { beginAtZero: true } } }
        });
      }

      createChart('statsChartWise','wise');
      createChart('statsChartMeru','meru');
      createChart('statsChartUSDT','usdt');

      // Live update chak 10 segonn
      setInterval(async () => {
        location.reload();
      },10000);
    }
  });

  const logoutBtn = document.getElementById("logoutBtn");
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "admin-login.html";
  });
}