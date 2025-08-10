// using UnityEngine;
// using UnityEngine.Networking;
// using UnityEngine.UI;

// public class ChatbotManager : MonoBehaviour
// {
//     public InputField chatInput;
//     public Text chatOutput;

//     public void SendChat()
//     {
//         StartCoroutine(ChatRequest(chatInput.text));
//     }

//     IEnumerator ChatRequest(string message)
//     {
//         string url = "http://localhost:5500/api/chat";
//         string json = "{\"message\": \"" + message + "\"}";
//         UnityWebRequest request = new UnityWebRequest(url, "POST");
//         byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(json);
//         request.uploadHandler = new UploadHandlerRaw(bodyRaw);
//         request.downloadHandler = new DownloadHandlerBuffer();
//         request.SetRequestHeader("Content-Type", "application/json");
//         yield return request.SendWebRequest();

//         if (request.result == UnityWebRequest.Result.Success)
//         {
//             chatOutput.text = request.downloadHandler.text;
//         }
//         else
//         {
//             chatOutput.text = "Error: " + request.error;
//         }
//     }
// }