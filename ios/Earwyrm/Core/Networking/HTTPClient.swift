import Foundation

enum HTTPError: LocalizedError {
    case invalidURL
    case badStatus(Int)
    case decodingFailed(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .badStatus(let code):
            return "HTTP \(code)"
        case .decodingFailed(let error):
            return "Decode error: \(error.localizedDescription)"
        }
    }
}

enum HTTPClient {
    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .useDefaultKeys
        return d
    }()

    static func get<T: Decodable>(
        _ urlString: String,
        headers: [String: String] = [:],
        decoder: JSONDecoder? = nil
    ) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw HTTPError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw HTTPError.badStatus(http.statusCode)
        }

        do {
            return try (decoder ?? Self.decoder).decode(T.self, from: data)
        } catch {
            throw HTTPError.decodingFailed(error)
        }
    }

    static func post<T: Decodable>(
        _ urlString: String,
        body: some Encodable,
        headers: [String: String] = [:],
        decoder: JSONDecoder? = nil
    ) async throws -> T {
        guard let url = URL(string: urlString) else {
            throw HTTPError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)

        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw HTTPError.badStatus(http.statusCode)
        }

        do {
            return try (decoder ?? Self.decoder).decode(T.self, from: data)
        } catch {
            throw HTTPError.decodingFailed(error)
        }
    }
}
