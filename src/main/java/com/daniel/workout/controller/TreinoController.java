package com.daniel.workout.controller;

import com.daniel.workout.model.Treino;
import com.daniel.workout.repository.TreinoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/treinos")
public class TreinoController {

    @Autowired
    private TreinoRepository repository;

    @GetMapping
    public List<Treino> listarTodos() {
        return repository.findAll();
    }

    @PostMapping
    public Treino salvar(@RequestBody Treino treino) {
        return repository.save(treino);
    }
}